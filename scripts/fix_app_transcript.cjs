const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldUserSpoke = `    const handleUserSpoke = (text: string, final: boolean) => {
       if (final) {
         setMessages(prev => [...prev, {
           id: Math.random().toString(),
           role: "user",
           content: text,
           timestamp: new Date()
         }]);
       }
    };`;

const newUserSpoke = `    const handleUserSpoke = (text: string, final: boolean) => {
       setInputMessage(text);
       if (final) {
         // Auto-send when final
         handleSendMessage(text);
       }
    };`;

code = code.replace(oldUserSpoke, newUserSpoke);

fs.writeFileSync(file, code);
