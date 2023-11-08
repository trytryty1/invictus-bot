#!/usr/bin/env node

// Using strict mode and importing required modules
"use strict";
var fs = require("fs-extra"),
  path = require("path"),
  arg = require("arg"),
  chalk = require("chalk"),
  execa = require("execa"),
  fsNative = require("fs");

// Function to display messages using Chalk library
const logMessage = (message) => {
  console.log(chalk`{cyan [nextron]} ${message}`);
};

// Parsing command line arguments
const args = arg({
  "--mac": Boolean,
  "--linux": Boolean,
  "--win": Boolean,
  "--x64": Boolean,
  "--ia32": Boolean,
  "--armv7l": Boolean,
  "--arm64": Boolean,
  "--universal": Boolean,
  "--config": String,
  "--publish": String,
  "--no-pack": Boolean,
});

// Current working directory and paths for app and dist directories
const currentDir = process.cwd();
const appDir = path.join(currentDir, "app");
const distDir = path.join(currentDir, "dist");

// Retrieving the renderer source directory from configuration or setting a default value
const rendererSourceDir = (() => {
  const configPath = path.join(process.cwd(), "nextron.config.js");
  return fsNative.existsSync(configPath)
    ? require(configPath).rendererSrcDir || "renderer"
    : "renderer";
})();

// Configuration for child processes
const childProcessConfig = { cwd: currentDir, stdio: "inherit" };

// Async function to build the Electron app
(async () => {
  process.env.ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES = "true";

  try {
    logMessage("Clearing previous builds");
    await Promise.all([fs.remove(appDir), fs.remove(distDir)]);

    logMessage("Building renderer process");
    const rendererDir = (() => {
        const nextConfigPath = path.join(process.cwd(), "nextron.config.js");
        if (fs.existsSync(nextConfigPath)) {
            const config = require(nextConfigPath);
            return config.rendererSrcDir || "renderer";
        } else {
            return "renderer";
        }
    })();
    const buildPath = path.join(currentDir, rendererDir);
    const outputDir = path.join(buildPath, "out"); // Assumed output directory

    await execa("next", ["build", buildPath], {
      cwd: currentDir,
      stdio: "inherit",
    });

    // Check if the output directory exists
    if (await fs.pathExists(outputDir)) {
        logMessage(`Copying output from ${outputDir} to your desired location`);
      const destinationDir = appDir // Change this to your target directory
      await fs.copy(outputDir, destinationDir);
      logMessage(`Successfully copied to ${destinationDir}`);
    } else {
        logMessage(`Output directory ${outputDir} does not exist. No copy performed.`);
    }

    logMessage("Building main process");
    await execa(
      "node",
      [path.join(__dirname, "webpack.config.js")],
      childProcessConfig
    );

    if (args["--no-pack"]) {
      logMessage("Skip packaging...");
    } else {
      logMessage("Packaging - please wait a moment");
      await execa(
        "electron-builder",
        getElectronBuilderArgs(),
        childProcessConfig
      );
    }

    logMessage("See `dist` directory");
  } catch (error) {
    logMessage(chalk`

{bold.red Cannot build electron packages:}
{bold.yellow ${error}}
`);
    process.exit(1);
  }
})();

// Function to generate arguments for Electron Builder based on command line arguments
function getElectronBuilderArgs() {
  const builderArgs = [];

  if (args["--config"]) {
    builderArgs.push("--config");
    builderArgs.push(args["--config"] || "electron-builder.yml");
  }

  if (args["--publish"]) {
    builderArgs.push("--publish");
    builderArgs.push(args["--publish"]);
  }

  if (args["--mac"]) {
    builderArgs.push("--mac");
  }

  if (args["--linux"]) {
    builderArgs.push("--linux");
  }

  if (args["--win"]) {
    builderArgs.push("--win");
  }

  if (args["--x64"]) {
    builderArgs.push("--x64");
  }

  if (args["--ia32"]) {
    builderArgs.push("--ia32");
  }

  if (args["--armv7l"]) {
    builderArgs.push("--armv7l");
  }

  if (args["--arm64"]) {
    builderArgs.push("--arm64");
  }

  if (args["--universal"]) {
    builderArgs.push("--universal");
  }

  return builderArgs;
}
