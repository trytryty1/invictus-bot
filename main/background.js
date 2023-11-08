import path from "path";
import { app, ipcMain } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import bot from "../bot-messenger";
//////////////////////////////////////////
const { Builder, By, Key, until } = require("selenium-webdriver");
//const chrome = require("selenium-webdriver/chrome");
import chrome from "selenium-webdriver/chrome";

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isProd) {
    await mainWindow.loadURL("app://./");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("start-bot", async (event, arg) => {
  const { username, password, group, message } = arg;
  event.reply("bot-status", "running the bot");

  const response = await runbot(username, password, group, message);
  event.reply("bot-status", response);
});

////////////////////////////////////////////
/////////// BOT LOGIC //////////////////////
//#region bot-logic

export default async function runbot(username, password, group, message) {
  let driver;
  try {
    let options = new chrome.Options();
    options.addArguments("--disable-notifications"); // Désactiver les notifications
    options.addArguments("--disable-user-media-security"); // Désactiver les notifications
    // Deny permission for notifications
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();
  } catch (e) {
    return e.message;
  }

  try {
    await driver.executeScript(`
            window.screen = {
                width: window.innerWidth,
                height: window.innerHeight,
                availWidth: window.innerWidth,
                availHeight: window.innerHeight
            };
            window.moveTo(0, 0);
            window.resizeTo(800, 600);
        `);

    // Connectez-vous à Facebook
    // await driver.get('https://www.facebook.com/login');
    // await driver.findElement(By.id('email')).sendKeys(process.env.FACEBOOK_USER);
    await driver.get(group);
    await driver.sleep(1000);
    await driver.findElement(By.id("email")).sendKeys(username); //process.env.FACEBOOK_USER);
    await driver.sleep(1000);
    await driver.findElement(By.id("pass")).sendKeys(password, Key.RETURN); //process.env.FACEBOOK_PASSWORD, Key.RETURN);
    //await driver.get('https://www.facebook.com/groups/6361783373936922/members');
    await driver.sleep(3000);

    //await driver.actions().sendKeys(Key.TAB).sendKeys(Key.TAB).perform();
    await driver.actions().sendKeys(Key.ENTER).perform();

    // Trouver toutes les listes
    let lists = await driver.findElements(By.css('div[role="list"]'));

    // Sélectionner la troisième liste (l'index 2 car l'indexation commence à 0)
    let thirdList = lists[lists.length - 1];
    //let thirdList = lists[2];

    let processedElements = 0;
    let keepScrolling = true;
    let message_send = 0;
    while (keepScrolling) {
      if (message_send >= 50) {
        break;
      }
      // Trouver tous les éléments dans la troisième liste
      let elements;
      try {
        elements = await thirdList.findElements(By.css("a"));
      } catch (e) {
        await driver.sleep(3000);
        return "Login failed!";
      }
      let names = [];
      for (let i = processedElements; i < elements.length; i++) {
        if (elements == null || elements.length == 0) {
          elements = await thirdList.findElements(By.css("a"));
        }
        let text = await elements[i].getText();

        // Chargez les noms à partir du fichier JSON
        const fs = require("fs");
        let dataJson;
        try {
          const data = fs.readFileSync("data.json", "utf8");
          dataJson = JSON.parse(data);
        } catch (e) {
          // If reading the file fails or it doesn't exist, create a default data structure
          dataJson = [];
          fs.writeFileSync(
            "data.json",
            JSON.stringify(dataJson, null, 2),
            "utf8"
          );
        }

        // Now you have 'dataJson' which will contain the JSON content or a default empty array if file read failed

        //convertir un float en int:

        // Vérifiez si le nom existe déjà dans le tableau
        if (processedElements < dataJson.length * 2) {
          processedElements++;

          if (processedElements % 10 == 0) {
            updateProgressBar(processedElements, dataJson.length * 2);
            // Si vous avez traité 10 éléments, scroller vers le bas pour charger plus d'éléments
            await driver.executeScript(
              "window.scrollTo(0, document.body.scrollHeight)"
            );
            await driver.sleep(2000); // Attente de 2 secondes pour que les nouveaux éléments soient chargés

            // Mettez à jour les éléments de la liste après le scroll
            elements = await thirdList.findElements(By.css("a"));

            // Si aucun nouvel élément n'a été chargé, arrêtez de scroller
            if (i >= elements.length - 1) {
              keepScrolling = false;
              break;
            }
          }
          continue;
        }

        if (dataJson.includes(text)) {
          await driver.sleep(1000);
          continue; // Passer à la prochaine itération de la boucle
        }

        //attendre entre 3 et 5 secondes
        let number = Math.floor(Math.random() * 5) + 3;
        await driver.sleep(number * 1000);

        if (
          !names.includes(text) &&
          text.trim().length > 0 &&
          !text.includes("Travail") &&
          text != "Ajouter comme ami(e)" &&
          !text.includes("Membre") &&
          !text.includes("depuis") &&
          !text.includes("Ajouter")
        ) {
          const url = await elements[i].getAttribute("href");
          // Ouvre un nouvel onglet
          await driver.executeScript(`window.open('${url}', '_blank');`);
          await driver.sleep(2000);

          // Alterner d'onglet
          let tabs = await driver.getAllWindowHandles();
          await driver.switchTo().window(tabs[tabs.length - 1]);
          await driver.actions().sendKeys(Key.ENTER).perform();

          //ajoute le nom au fichier data.json
          dataJson.push(text);
          fs.writeFileSync("data.json", JSON.stringify(dataJson));

          names.push(text);

          await driver.sleep(10000);

          let images = await driver.findElements(By.tagName("img"));
          images = await Promise.all(
            images.map(async (img) => {
              let height = await img.getCssValue("height");
              return height === "16px" ? img : null;
            })
          ).then((result) => result.filter((e) => e !== null));
          await images[0].click();

          await driver.sleep(5000);

          let final_message = message; // process.env.MESSAGE;

          //final_message.replace("NAME", text);
          //remplacer la premiere occurence de '!' par le prénom de la personne donc le prendre la premiere chaine et cut apres espace le getText
          // final_message = final_message.replace("!", text.split(" ")[0]);
          await driver
            .switchTo()
            .activeElement()
            .sendKeys(final_message, Key.RETURN);
          message_send += 1;
          await driver.sleep(2000);

          await driver.close();
          await driver.switchTo().window(tabs[0]);
        }
        processedElements++;

        if (processedElements % 10 == 0) {
          // Si vous avez traité 10 éléments, scroller vers le bas pour charger plus d'éléments
          await driver.executeScript(
            "window.scrollTo(0, document.body.scrollHeight)"
          );
          await driver.sleep(2000); // Attente de 2 secondes pour que les nouveaux éléments soient chargés

          // Mettez à jour les éléments de la liste après le scroll
          elements = await thirdList.findElements(By.css("a"));

          // Si aucun nouvel élément n'a été chargé, arrêtez de scroller
          if (i >= elements.length - 1) {
            keepScrolling = false;
            break;
          }
        }
      }
    }
  } catch (e) {
    return e.message;
  } finally {
    await driver.quit();
  }
}

let startTime = Date.now(); // Temps de début

function updateProgressBar(processedElements, totalElements) {
  process.stdout.write("\x1Bc"); // Effacer le terminal
  let percentage = Math.floor((processedElements / totalElements) * 100);

  if (percentage < 100) {
    let endTime = Date.now(); // Temps de fin
    let elapsedTimeInSeconds = (endTime - startTime) / 1000; // Temps écoulé en secondes

    // Estimation du temps restant en fonction du pourcentage actuel et du temps écoulé
    let estimatedTotalTimeInSeconds = (elapsedTimeInSeconds * 100) / percentage;
    let estimatedTimeRemainingInSeconds =
      estimatedTotalTimeInSeconds - elapsedTimeInSeconds;

    // Affichage du temps restant estimé
    process.stdout.write(
      `Temps restant estimé: ${formatTime(estimatedTimeRemainingInSeconds)}\n`
    );
  } else {
    process.stdout.write("Passing terminé, envoie des messages en cours ..\n");
  }
}

function formatTime(seconds) {
  let hours = Math.floor(seconds / 3600);
  let minutes = Math.floor((seconds % 3600) / 60);
  let remainingSeconds = Math.floor(seconds % 60);

  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

//#endregion
