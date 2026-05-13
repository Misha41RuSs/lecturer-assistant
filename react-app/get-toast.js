const fs = require('fs');
const file = fs.readFileSync('node_modules/sonner/dist/index.mjs', 'utf8');
const lines = file.split('\n');
lines.forEach((l, i) => {
  if (l.includes("React.createElement(\"li\"")) {
     console.log(lines.slice(i, i+30).join('\n'));
  }
});
