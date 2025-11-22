This is the repo for version 2 of Interactive Survey Tools For Data Visualization, mirrored from version 1 repo: https://github.com/seanmccoyOSU/Interactive-Survey-Tools-For-Data-Visualizations.

# Description
Version 2 will built on version 1 and continuing the develpoment of Interactive Survey Tool For Data Visualization, a web-based survey platform that enables researchers to create interactive, data-driven questionnaires with dynamic visualizations for richer and more precise participant insights.

# Team Roster and Contact
- Bessie: heyux@oregonstate.edu
- Edward: htoone@oregonstate.edu
- Kali: pulancop@oregonstate.edu
- Kaveenaya: srinivak@oregonstate.edu
- Wesley: trieuw@oregonstate.edu

# Overview
The goal of this project is to develop a custom web-based survey tool that allows researchers at Oregon State University (or other
organizations) to create interactive surveys featuring advanced data visualizations. Unlike existing platforms like Qualtrics, this tool supports dynamic elements such as zooming, panning, and selecting regions on visual assets like SVGs, allowing researchers to gather more nuanced and insightful data and responses. The platform emphasizes usability, accessibility, and data security, aiming to enhance both the researcher and participant experience while addressing the limitations of current survey tools.

Visit the landing page here: [https://seanmccoyosu.github.io/Interactive-Survey-Tools-For-Data-Visualizations/]

# Dependencies
To run this application on your local device, copy the repository and ensure the necessary dependencies are installed.

### Node
1. Go to the official Node.js website: https://nodejs.org
2. Download the LTS version for your operating system (Windows/macOS/Linux).
3. Run the installer and follow the prompts (accept default options).
4. Open the terminal in your IDE and verify the installation:
```
node -v
npm -v
```

### Docker (Desktop)
1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for your OS and run the installer.
3. After installation, launch Docker Desktop and sign in with a (new) Docker Hub account.
4. In the terminal, check for successful installation:
```
docker --version
docker compose version
```

# Quick Testing Guide for Your Local Machine
### Launching
Rename the file `.env` for later use.

Run `mv .env.local .env`.

We need to set up the mySQL database in Docker:
- first make sure the script is executable, run `chmod +x make_containers_NO_API.sh`
- run the script `./make_containers_NO_API.sh`

Run `docker compose up --build` to run the application. This may take a while. Visit `http://localhost:5000/` and `http://localhost:8000/` to verify.

Troubleshoot: if you are having mySQL errors such as access denied or your docker is not loading API containers, try `sed -i 's/\r$//' wait-for.sh` for troubleshoot.

### Cleaning
Run `docker compose down` to clean up after you've tested.

# Branching and Reviews
We follow a simple workflow to manage development and ensure code quality:

- **Branching:** New work is done in `feature/` branches (e.g., `feature/tools`).
- **Pull Requests (PRs):** Changes are pushed to a feature branch, then a PR is opened targeting `main`.
- **Review:** At least one teammate reviews and approves the PR before it is merged.
- **Template:** PRs use the template in `.github/PULL_REQUEST_TEMPLATE.md` to include description, checklist, and testing notes.


# More Info
Please refer to this repository's wiki page for help:
https://github.com/seanmccoyOSU/Interactive-Survey-Tools-For-Data-Visualizations/wiki
