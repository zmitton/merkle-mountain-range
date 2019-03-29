let foo = (num) => {
  let things = []
  for (var i = 0; i < num; i++) {
    things.push(Math.random())
  }

  let lastPeak = 0
  let newPeaks = 0
  for (var i = 0; i < things.length; i++) {
    if(things[i] > lastPeak){
      newPeaks++
      lastPeak = things[i]
    }
  }
  return newPeaks
}


let bar = (num) => {
  let bat = []
  for (let i = 0; i < 100; i++) {
    bat.push(foo(num))
  }
  let sum = 0
  for (let i = 0; i < bat.length; i++) {
    sum += bat[i]
  }
  return sum/bat.length
}

console.log(bar(1000))
