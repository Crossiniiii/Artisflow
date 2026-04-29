const fs = require('fs');

const code = fs.readFileSync('src/pages/BranchManagement.tsx', 'utf8');

let stack = [];
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    // Naive tracking just for {} and () and <>
    if (char === '{') stack.push({char, line: i + 1});
    else if (char === '}') {
      if (stack.length === 0 || stack[stack.length - 1].char !== '{') {
        console.log(`Mismatch } at line ${i + 1}`);
      } else {
        stack.pop();
      }
    }
    else if (char === '(') stack.push({char, line: i + 1});
    else if (char === ')') {
      if (stack.length === 0 || stack[stack.length - 1].char !== '(') {
        console.log(`Mismatch ) at line ${i + 1}`);
      } else {
        stack.pop();
      }
    }
  }
}

console.log('Remaining in stack:', stack.slice(-5));
