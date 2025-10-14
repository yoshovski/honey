# honey (fork)

A lightweight dashboard for self-hosted services — pure HTML/CSS/JS, client-side only.

This repository is a fork of dani3l0/honey and incorporates changes from yoshovski (v2.4.1-yoshovski1) plus additional improvements for a more admin-friendly, internationalized experience.


> **Note:** This is a modified version of the original *honey* project by `dani3l0`. If you want the original, see https://github.com/dani3l0/honey


honey is written in **pure** `HTML` `CSS` `JS` so dynamic backend or special webserver configuration is not required.
It works out-of-the-box as all operations are done client-side.


### Screenshots
#### Main Page
<img src="https://private-user-images.githubusercontent.com/29847122/500722357-2c55188d-ab61-4bc6-88a5-f264a295b64a.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjA0MTEzMTcsIm5iZiI6MTc2MDQxMTAxNywicGF0aCI6Ii8yOTg0NzEyMi81MDA3MjIzNTctMmM1NTE4OGQtYWI2MS00YmM2LTg4YTUtZjI2NGEyOTViNjRhLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEwMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMDE0VDAzMDMzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWYwYTAzMThmNzliMmExZmZhNGFiM2Y3NTBmYTA0ZDZlMWQ5N2FmZDNkMjJlMzJhOGY0NTRiNDdmYjcyZjAwOWUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.ZPpd5WWfFZNyucgDnYYyirlOd5QorGdPMg_MFHQuDW8" style="width: 720px">


#### Language switch

<img src="https://private-user-images.githubusercontent.com/29847122/500722952-3d1ec3a9-56e6-47a3-b7bd-88aaa58171a3.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjA0MTEzMTcsIm5iZiI6MTc2MDQxMTAxNywicGF0aCI6Ii8yOTg0NzEyMi81MDA3MjI5NTItM2QxZWMzYTktNTZlNi00N2EzLWI3YmQtODhhYWE1ODE3MWEzLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEwMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMDE0VDAzMDMzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTMxM2M4ZjRmOTRiMzFlMDdlNTA2OTQ3NzAzNjY1MDMyNzlkNGIzOTZmZWI3MWY1ZmE0M2NiMWExYjcxNjg1OGYmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.muLC-TOfp-lcKxUu2x321HbaUzdKqvOb8OncHxKHDuw" style="width: 150px">



## 🚀 Installation

### 🕸️ On existing webserver

1. Download latest prebuilt archive from **[Releases](https://github.com/yoshovski/honey/releases)**.

2. Extract downloaded archive to your webserver root.

3. You're done!


### 🐋 via Docker

```
docker run -p 4173:4173 -v /path/to/config:/app/dist/config ghcr.io/yoshovski/honey:latest
```

- `-p 4173:4173` - exposes HTTP port to your machine
- `-v /path/to/config:/app/dist/config` - mounts config directory to your local filesystem, missing config files will be created automatically

If you have custom icons or background images, you can freely put them in `config` dir.
Just remember to provide valid URLs (with `/config` prefix).

_alternatively, use a `docker-compose.yml` file_


## ⚙️ Configuration

Base configuration file is located at `config/config.json`.

## 🌐 Internationalization / Language switch

For now the language switch supports English and Italian. To enable it you must add two .json files into the public config folder:

- /public/config/config.en.json
- /public/config/config.it.json

**Important**:
- The json files must follow the same top-level structure as your existing `config/config.json` (same keys: `ui`, `services`, `gear`, etc.)
- Recommended workflow: copy `public/config/config.json` (or `config/config.json`) to `public/config/config.en.json` and `public/config/config.it.json`, then translate only the user-facing strings (for example a `strings` object or the `ui` fields) while keeping the rest identical
- Place images referenced by those locale files under `/public/config` (or use valid public URLs) and update paths accordingly


### 📱 Tweaking the user interface

The following keys are available under `ui` section.
Some of them are listed in _Settings_ page and can be customized by end-user.

| Key name				| Description																								| in Settings	 |
|-----------------------|-----------------------------------------------------------------------------------------------------------|----------------|
| `name`				| Name shown at the main screen and the tab title.															|		❌		|
| `desc`				| Short description shown under title at the main screen.													|		❌		|
| `icon`				| Icon shown at the main screen and as site's favicon.														|		❌		|
| `wallpaper`			| Background image visible when dark mode is disabled.														|		❌		|
| `wallpaper_dark`		| Background image visible when dark mode is enabled.														|		❌		|
| `dark_mode`			| Tells whether dark mode is enabled by default. (Available values: `Auto`,`Off`,`On`)						|		✅		|
| `open_new_tab`		| Tells whether clicking on a service will open it in new tab by default.									|		✅		|
| `ping_dots`			| Enables small dot before service name indicating whether is it available or not.							|		✅		|
| `blur`				| Tells whether card background blur is enabled by default.													|		✅		|
| `animations`			| Tells whether UI animations are enabled by default.														|		✅		|
| `trusted_domains`		| Array of domains (or IP addresses) to no longer be considered as 3rd-parties. RegExp is fully supported.	|		✅		|


### 🔗 Adding custom services

`services` section is an array containing objects. Object's structure looks like this:

| Key name			| Description																	|
|-------------------|-------------------------------------------------------------------------------|
| `name`			| Your service's name.															|
| `desc`			| Short description shown under service's name.									|
| `href`			| URL address of your service. It is directly passed to `<a>` tag.				|
| `icon`			| Path to an icon of your service.												|

Example:
```
...
{
	"name": "CalDav",
	"desc": "Simple CalDav server for calendar sync between various devices.",
	"href": "caldav",
	"icon": "img/preview/caldav.png"
},
...
```


## 🛠️ Development

honey is built on top of [Vite.js](https://vitejs.dev/). This tool allows faster development and offers various optimizations.

How to prepare a development environment:

```
# Download the source code
git clone https://github.com/yoshovski/honey && cd honey

# Install required modules
npm i
```


### 🗼 Live server

**For coding.** This will spin up a HTTP server on **[localhost:5173](http://localhost:5173/)**. Each time source file is saved, UI will automatically hot-reload so there is no need for `ALT+TAB` and `F5`.

```
npm run dev
```


### 🏗️ Build

**Prepare project for production.** This command will link and optimize project assets to take less space and require less bandwith. Prebuilt assets will be stored in `dist` directory and are ready to be put in a webserver root.

```
npm run build
```


## 🤝 Credits

The author dani3l0 of the original repository: https://github.com/dani3l0/honey

Of course, some third-party resources are used in this project. I kanged them for self-hosting, easier development and to avoid compatibility issues.

- **[Material Icons](https://github.com/materialos/android-icon-pack/)**, for app icons at _Services_ page

- **[Google Fonts](https://fonts.google.com/)**, for material icons on buttons and Quicksand font

- **honey icon** - random icon found in DuckDuckGo Images

- **Wallpapers** - very nice background images kanged from [wallhaven](https://wallhaven.cc/)
