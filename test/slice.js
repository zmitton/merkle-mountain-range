var sha3 = require('js-sha3')
const Bn = require('bignumber.js')

var h = (x) => { return Buffer.from(sha3.keccak256(x),'hex') }

// var L = 50
var L = 300
// var L = 81

var NUM_BLOCKS = 5000000
var NUM_BUCKETS = 5
var NUM_SAMPLES = 600


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
    if(sample <= currentIntervalMax){
      return i
    }
  }
}

var sample = (numBlocks, suffexLength, numSamples) => {
  var samples = []
  var delta = suffexLength / numBlocks 
  var lnDelta = Math.log(suffexLength / numBlocks)
  var seedHash = h(Buffer.from([]))
  // var maxX = numBlocks - suffexLength
  var f = (x) => {
   return pdf(x, lnDelta)
  }
  var fInverse = (y) => {
   return pdfInverse(y, lnDelta)
  }
  var maxX = 1 - delta
  var minY = f(0)

  // init vals shouldnt really get used but its probably a wash
  var currX = maxX
  var currY = f(currX)
  console.log('delta ', delta, ' ln(delta) = ', lnDelta, ' currX ', currX, ' currY ', currY)

  for (var i = 0; i < numSamples; i++) {
    seedHash = h(seedHash)
    currY = getRandom(minY, f(currX), seedHash)
    var minX = fInverse(currY)
    currX = getRandom(minX, maxX, seedHash)
    // console.log('x,y (', currX, ',\t', currY)
    samples.push(currX)
  }

  return samples
}
var getRandom = (min, max, seedHash) => {
  if(min > max){ throw new Error('min ' + min + '  max ' + max) }
  // console.log('min ' + min + '  max ' + max)

  var intervalSize = max - min

  seedNum = new Bn(h(Buffer.from([])).toString('hex'),16)
  seedNum.mod(intervalSize)

  return Math.random() * intervalSize + min
}
var pdf = (x, lnDelta) => {
 return 1 / ((x-1) * lnDelta)
}
var pdfInverse = (y, lnDelta) => {
 return (1 / (y * lnDelta)) + 1
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


// var s = sample(NUM_BLOCKS, L, 25)
var s = sample(NUM_BLOCKS, L, NUM_SAMPLES)
var b = bucketize(10, s, 1 - L / NUM_BLOCKS)

bucketize(10, sample(NUM_BLOCKS, L, NUM_SAMPLES), 1 - L / NUM_BLOCKS)

numNonzeroEpochs(bucketize(parseInt(NUM_BLOCKS/30000), sample(NUM_BLOCKS, L, NUM_SAMPLES), 1))

console.log("DOING THINGS")
