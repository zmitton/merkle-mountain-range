// this file will use real _exact_ integer math on blocknumbers to create a _deterministic_ sample set

var sha3 = require('js-sha3')
const Bn = require('bignumber.js')
var h = (x) => { return Buffer.from(sha3.keccak256(x),'hex') }


var L = 80
var NUM_BLOCKS = 5000000
var NUM_BUCKETS = 5
var NUM_SAMPLES = 600
var LN_DELTA = Math.floor(Math.log(L / NUM_BLOCKS))


var sliceSample = (pdf, pdfInverse, numSamples, seedHash, x0) => {
  if(!(numSamples instanceof Bn && seedHash instanceof Buffer)){
    throw new Error('Wrong arg types for SliceSample')
  }

  var samples = []

  // var minX = new Bn(0)
  var ZERO = new Bn(0)
  var minX = new Bn(0)
  var maxX = x0
  var currX = x0
  var currY

  for (var i = 0; i < numSamples; i++) {
    seedHash = h(seedHash)
    currY = getRandom(ZERO, pdf(currX), seedHash)
    
    temp = pdfInverse(currY)
    minX = temp.isGreaterThan(ZERO) ? temp : ZERO
    seedHash = h(seedHash)
    currX = getRandom(minX, maxX, seedHash)
    samples.push(currX)
    console.log(i)
    console.log("curx", currX.toString(10), " y ", currY.toString(10))
    
    // inverseCheck(currX)
  }

  return samples
}
var getRandom = (_min, _max, seedHash) => {
 
  if(_min.isGreaterThan(_max) || _min.isLessThan(0) || _max.isLessThan(0)){ 
    throw new Error('_min ' + _min + '  _max ' + _max) 
  }
  // console.log('_min ' + _min + '  _max ' + _max)
  var aaa = _min / 1
  var bbb = _max / 1

  var max = new Bn(_max)
  var min = new Bn(_min)
  var intervalSize = max.minus(min)
  var seedNum = new Bn(h(seedHash).toString('hex'),16)
  var offset = seedNum.mod(intervalSize)

  return min.plus(offset)
}


var totalDifficulty = new Bn(NUM_BLOCKS) // temp solution
var C = new Bn('100000000000000000000000000000000',16) // 2^128
var suffexDifficulty = new Bn(L)

var flyPdf = (x) => {
  return C.idiv(totalDifficulty.minus(x)) //look into what multiplier to use
}
var flyPdfInverse = (y) => {
  return totalDifficulty.minus(C.idiv(y))
}

var numNonzeroEpochs = (epochs) => {
  nonzeroEpochs = 0
  for (var i = 0; i < epochs.length; i++) {
    if(epochs[i] > 0){
      nonzeroEpochs++
    }
  }
  return nonzeroEpochs
}
// pdf(0.14475118592859454, Math.log(L / NUM_BLOCKS))
// var inverseCheck = (a) => {
//   var b = flyPdf(a)
//   var c = flyPdfInverse(b)

//   if(a.toString() != c.toString()){
//     console.log("tottaldif ", totalDifficulty.toString(10))
//     console.log("a ", a.toString(10), " b ", b.toString(10), " c ",  c.toString(10))

//     throw new Error(a.toString(), c.toString())
//   }
//   console.log("a ", a.toString(10), " b ", b.toString(10), " c ",  c.toString(10))
//   return c
// }

// for (let index = 0; index < 1000; index++) {
//   var a = Math.floor(Math.random()*10000000)
//   thing(a)
  
// }

var s1 = sliceSample(
  flyPdf, 
  flyPdfInverse, 
  new Bn(NUM_SAMPLES), 
  Buffer.alloc(32), 
  totalDifficulty.minus(suffexDifficulty)
)

// numNonzeroEpochs(bucketize(parseInt(NUM_BLOCKS / 30000), s1, 1))


// , 1 - L / NUM_BLOCKS)

// // var s = sample(NUM_BLOCKS, L, 25)
// var s = sliceSample(NUM_BLOCKS, L, NUM_SAMPLES)
// var b = bucketize(10, s, 1 - L / NUM_BLOCKS)


var bucketize = (numBuckets, samples, numBlocks) => {
  var buckets = new Array(numBuckets).fill(0)
  for (var i = 0; i < samples.length; i++) {
    buckets[findBucket(numBuckets, samples[i], numBlocks)] += 1
  }
  return buckets
}
var findBucket = (numBuckets, sample, numBlocks = 1) => {
  var interval = numBlocks / numBuckets
  var currentIntervalMax = 0
  for (var i = 0; i < numBuckets; i++) {
    currentIntervalMax += interval
    if (parseInt(sample) <= currentIntervalMax) {
      return i
    }
  }
}


var y = bucketize(parseInt(NUM_BLOCKS / 30000), s1, 1)
// var z = numNonzeroEpochs(bucketize(parseInt(NUM_BLOCKS / 30000), s1, 1))
// first few elems look good but then it gets infinity, and then NaN

// console.log(z)
// bucketize(10, sliceSample(NUM_BLOCKS, L, NUM_SAMPLES), 1 - L / NUM_BLOCKS)

// numNonzeroEpochs(bucketize(parseInt(NUM_BLOCKS/30000), sliceSample(NUM_BLOCKS, L, NUM_SAMPLES), 1))

// numNonzeroEpochs(bucketize(parseInt(NUM_BLOCKS / 30000), sliceSample(NUM_BLOCKS, 5, NUM_SAMPLES), 1))
// // var trials = []
// // for (var i = 0; i < 25; i++) {
// //   trials.push(numNonzeroEpochs(bucketize(parseInt(NUM_BLOCKS/30000), sliceSample(NUM_BLOCKS, 5, NUM_SAMPLES), 1)))
// // }
// var sum = 0
// // for (var i = 0; i < trials.length ; i++) {
// //   sum += trials[i]
// // }
// console.log(sum/trials.length)

// console.log("DOING THINGS")

// // 600 samples each below
// // l=5;   epochs~=54
// // l=25;  epochs~=62
// // l=81;  epochs~=65
// // l=250; epochs~=66

// the data looks ok.  however it seems to get a bit trapped toward 99.99% of the tip
// make sure this isnt a bug. This probably is affected by L. And choosing low L
// would then affect how weighted things are toward the tip, and likely how many 
// total samples are required. to do: add these factors to the equation.
// dynamically pick these values hopfully using sane constants for 100 year time-line
// Anything that has to be variable, will have to be analyzed for security vulns because
// attackers can stretch those vars to their limits i.e. 0, 1, infinity, in order
// to cause the sampling to become i.e cyclical, or only pick 1 block etc.
