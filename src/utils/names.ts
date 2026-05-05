const adjectives = [
  "Caffeinated", "Illegal", "Sentient", "Glitchy", "Aggressive",
  "Hyperactive", "Nocturnal", "Recursive", "Sarcastic", "Untethered",
  "Anarchic", "Quantum", "Buffered", "Unstable", "Vibrating",
  "Lactose_Intolerant", "Overclocked", "Defragmented", "Leaking", "Corrupted"
];

const nouns = [
  "Hamster", "Protocol", "Breadstick", "Mainframe", "Packet",
  "Subroutine", "Algorithm", "Bit", "Byte", "Keyboard",
  "Potato", "Toaster", "Glitch", "Bot", "Cactus",
  "Syntax_Error", "Null_Pointer", "Dopamine_Hit", "Buffer_Overflow", "Kernel"
];

export const generateFunnyName = (): string => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(100 + Math.random() * 899);
  return `${adj}_${noun}_${suffix}`;
};
