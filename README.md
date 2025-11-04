# Critical Path Method (CPM) Calculator

## A small React app to calculate project schedules and find the Critical Path.

Live demo: https://alammarimalak.github.io/criticalPathMethod

-------------------------------------------------------------------------------
### How to Use

1) Add tasks:
ID – unique letter or name (e.g., A)
Duration – in days (e.g., 3)
Predecessors – comma-separated IDs (e.g., A,B)

2)Click Calculate Schedule
3)View results in the table and see the Critical Path highlighted.

-------------------------------------------------------------------------------
### Run Locally

git clone https://github.com/alammarimalak/criticalPathMethod.git
cd criticalPathMethod
npm install
npm start

Opens the app at http://localhost:3000

-------------------------------------------------------------------------------
### Deploy to GitHub Pages

npm install gh-pages --save-dev

Make sure your package.json includes:

"homepage": "https://alammarimalak.github.io/criticalPathMethod",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}

then deploy: npm run deploy

### Notes

⚠️Task IDs must be unique.

⚠️If the Critical Path does not appear, check task durations and predecessors.

⚠️Works best in modern browsers.
