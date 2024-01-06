# Getting Started
1) Use `cp .env.example .env`
2) Fill in the `TOKEN` with your Discord bot's token from the Discord Developer portal.
3) Fill in the `DATABASE_URL` with the Guizhong mongodb link.  
4) Use `npm run deploy` to deploy the slash commands to Discord. (not needed if you're using `npm run start`)
5) Use `npm run build` to compile the TypeScript code to JavaScript to run. (not needed if you're using `npm run start`)
6) Use `node run start` to run the bot. 
- OR use: `pm2 start ecosystem.config.js` to use PM2  