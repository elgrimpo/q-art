// Create Who list
const listWho = [
  "An astronaut is",
  "An alien is",
  "A doctor is",
  "A scientist is",
  "An actor is",
  "A writer is",
  "A photographer is",
  "A pilot is",
  "A kid is",
  "An animal is",
  "A teacher is",
  "A police officer is",
  "A fire fighter is",
  "A nurse is",
  "A ninja is",
  "A dinosaur is",
  "A robot is",
];

// Create What list
const listWhat = [
  "sleeping",
  "walking",
  "running",
  "standing",
  "looking",
  "exploring",
  "creating",
  "writing",
  "painting",
  "observing",
  "jumping",
  "eating food",
  "floating",
  "flying",
];

// Create Where list
const listWhere = [
  "at home",
  "in an office",
  "in a laboratory",
  "at a factory",
  "underwater",
  "in space",
  "on an Alien Planet/Moon",
  "on a Solar System Planet/Moon",
  "at school",
  "at the the park",
  "at the the pool"
];

// Create When list
const listWhen = [
  "in the past",
  " ",
  "in the future",
  "during the day",
  "at night",
  "after school"
];

// Create How list
const listHow = [
  "in a car",
  "in a spaceship",
  "in a rocket",
  "on a rover",
  "by a satellite",
  "in a space station",
  "by a space station",
  "on a horse",
  "in an airplane",
  "in a firetruck",
  "in a police car",
  "on a bicycle",
  "on a motorcycle",
  "on a unicycle",
  "on a dinosaur",
  "in a boat",
  "in a seaplane",
];

// const min = 0;
// const maxWho = listWho.length - 1;
// const maxWhat = listWhat.length - 1;
// const maxWhere = listWhere.length - 1;
// const maxWhen = listWhen.length - 1;
// const maxHow = listHow.length - 1;

function promptRandomizer() {
  //do the math
  //var Who1 = Math.floor(Math.random() * (maxWho - min + 1)) + min;
  const Who1 = Math.floor(Math.random() * listWho.length);
  //var What1 = Math.floor(Math.random() * (maxWhat - min + 1)) + min;
  const What1 = Math.floor(Math.random() * listWhat.length);
  //var Where1 = Math.floor(Math.random() * (maxWhere - min + 1)) + min;
  const Where1 = Math.floor(Math.random() * listWhere.length);
  //var When1 = Math.floor(Math.random() * (maxWhen - min + 1)) + min;
  const When1 = Math.floor(Math.random() * listWhen.length);
  //var How1 = Math.floor(Math.random() * (maxHow - min + 1)) + min;
  const How1 = Math.floor(Math.random() * listHow.length);

  //output
  return `${listWho[Who1]} ${listWhat[What1]} ${listWhere[Where1]} ${listWhen[When1]} ${listHow[How1]}`
}

export default promptRandomizer;