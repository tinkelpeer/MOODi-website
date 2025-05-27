# MOODi Website

MOODi is an interactive companion designed to convey 25 distinct emotions, dynamically shifting its emotional state based on the nature of the conversation. MOODi gauges the user's tone and energy, matching and amplifying the mood to create a more engaging and empathetic interaction. This web interface allows you to seamlessly connect with MOODi, send messages, observe its emotional shifts in real time, and explore its full range of feelings—can you figure out how to let MOODi express all 25 emotions?

## Table of Contents

* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Configuration](#configuration)
* [Running the App](#running-the-app)
* [Project Structure](#project-structure)
* [Dependencies](#dependencies)

## Prerequisites

* Node.js (v14 or higher)
* npm (Node package manager)

## Installation

```bash
git clone https://github.com/tinkelpeer/MOODi-website.git
cd MOODi-website
npm install
```

## Configuration

Create a `.env` file in the project root and specify any necessary environment variables:

```env
PORT=3000
# Add any MOODi-related variables your setup requires, for example:
# MOODI_API_URL=https://api.moodi.example.com
# MOODI_API_KEY=your_api_key_here
```

## Running the App

Start the server:

```bash
npm start
```

By default, the server listens on the port specified in the `PORT` environment variable (defaults to 3000 if not set). Open your browser and navigate to `http://localhost:3000` to access the MOODi website.

## Project Structure

```
MOODi-website/
├── public/         # Static assets served by Express
│   ├── css/        # Stylesheets
│   ├── js/         # Client-side JavaScript
│   └── index.html  # Main HTML file
├── .gitignore      # Files and folders to ignore in Git
├── package.json    # Project metadata and dependencies
└── server.js       # Express server setup
```

## Dependencies

* [express](https://www.npmjs.com/package/express) — Fast, unopinionated, minimalist web framework for Node.js
* [dotenv](https://www.npmjs.com/package/dotenv) — Loads environment variables from a `.env` file
