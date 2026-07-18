const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Patch 1: Main chat bubble
code = code.replace(
  /className=\{\`max-w-\[85%\] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative/g,
  'className={`max-w-[85%] rounded-2xl px-5 py-4 text-base leading-relaxed shadow-sm relative'
);

code = code.replace(
  /<div className="whitespace-pre-wrap font-sans text-xs md:text-sm">/g,
  '<div className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed tracking-wide">'
);

// Patch 2: Comms Hub chat bubble
code = code.replace(
  /className=\{\`max-w-\[75%\] rounded-2xl px-4 py-2\.5 shadow-sm transition-all/g,
  'className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm transition-all'
);

code = code.replace(
  /<div className="whitespace-pre-wrap text-sm leading-relaxed">\{m\.content\}<\/div>/g,
  '<div className="whitespace-pre-wrap text-base leading-relaxed tracking-wide">{m.content}</div>'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx chat styles");
