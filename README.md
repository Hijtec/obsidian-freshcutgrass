# FreshCutGrass Integration

## What it does

The plugin can synchronize your local [Obsidian](https://obsidian.md) Vault with your [FreshCutGrass](https://freshcutgrass.app) application library.

You can import your homebrew and library saved adversaries and environments to your local Obsidian vault, edit your homebrew adversaries in Obsidian and sync it with the library.

The plugin was created for usage with Fantasy Statblocks with rolling dice support
![alt text](image-8.png)

## Prerequisites

This plugin requires Obsidian Custom Frames to work properly.
![alt text](image-5.png)

Thi plugin works best with Fantasy Statblocks plugin
![alt text](image-7.png)

## Installation

Install BRAT comunity plugin
![alt text](image-3.png)

and then using the BRAT plugin settings add a plugin
![alt text](image-2.png)

Enter Repository `https://github.com/Hijtec/obsidian-freshcutgrass` and choose Latest version
![alt text](image-4.png)

This will install the plugin into your obsidian vault.

Makes sure all of the needed plugins are enabled
![alt text](image-10.png)

## Fantasy Statblocks Layout Import

Download the `FCG2.json` file from
<https://github.com/Hijtec/obsidian-freshcutgrass/releases>

In Fantasy Statblocks plugin settings, import the `FCG2.json` file
![alt text](image-11.png)

## Setup the Custom Frame Server

Download the `server.js` file from
<https://github.com/Hijtec/obsidian-freshcutgrass/releases>

Create a new Custom Frame
![alt text](image-6.png)

Go into its setting, name it however you like.

Set the URL to `https://freshcutgrass.app`
![alt text](image-13.png)

Copy the contents of the `server.js` file to the Custom Frame Additional Javascript field.

![alt text](image.png)

Restart or reload Obsidian
![alt text](image-12.png)

### Modify Options if needed

For example the Import Folder is the folder you sync your adversaries in
![alt text](image-1.png)

Modifying the options requires restart of Obsidian

### Open Custom Frame

Use command CustomFrames: Open {YourChosenCustomFrameNameHere}
![alt text](image-14.png)

Login using Discord
![alt text](image-15.png)

Restart Obsidian.

You can now use the Plugin Commands.

## Available Obsidian Commands

![alt text](image-9.png)

## Roadmap

- [ ] Make images work (local/remote)
- [ ] Fix Fantasy Statblocks, they render in 5e for no fucking reason
- [ ] Prettier Fantasy Statblock for Environments
- [ ] Support ToneAndFeel fields for Environments
- [ ] Make it work with <https://github.com/javalent/initiative-tracker>
- [ ] UX improvements
