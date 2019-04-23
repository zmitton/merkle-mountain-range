# Merkle Mountain Range

A type of merkle tree that can be visualized as many (perfect) merkle trees which are then combined into 1, by creating a single root from all of their peaks. The rules for making the tree(s) however are rigidly deterministic such that the entire structure depends only on the number of items put into it. When appending leaves, nodes are not updated, only appended. This makes for a minimal amount of total hash computations (~2n), while having the useful property that a _merkle inclusion proof_ of a leaf at any time, contains a superset of its _merkle inclusion proof_ at any previous time.

These unique properties make it optimal for proving the ordering of a linked hashlist (read blockchain) as described in [FlyClient](https://www.youtube.com/watch?v=BPNs9EVxWrA).


![alt text](img/mmr.jpg "Logo Title Text 1")


## Resources 

[MMR data structure](https://github.com/juinc/tilap/issues/244) invented by Peter Todd

I have ammended the structure slightly to work better for flyclient (I beleive it will work better for most use-cases). The difference is that the "bagging the peaks" process (used to calculate the merkle-root) by Todd was changed to instead simply digest the peaks as a concatonated array.

## Use

```
npm install merkle-mountain-range
```

```javascript
const { MMR, keccak256FlyHash } = require('merkle-mountain-range')
let mmr = new MMR(keccak256FlyHash)
let genesisHash       = Buffer.from('d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3','hex')
let genesisDifficulty = Buffer.from('0000000000000000000000000000000000000000000000000000000400000000','hex')
let zeroithLeaf = Buffer.concat([genesisHash, genesisDifficulty])
mmr.append(zeroithLeaf, 0).then(()=>{ console.log(mmr) })
```

#### Statistics

With (memoryBasedDb) 1000 64-byte leaves (2015 macbookpro)
 - Time per `append()` =  0.000119s
 - Time per `get()` =  0.000289s

The FileBasedDb (temporarily broken) will be slower but its still only does log(n) total reads/writes

The way `mmr.get(leafIndex)` works currently, is that it verifies as it traverses down the tree. This has the side affect of verifying the leaf as well (thus making it trivial to impliment verification). You can technically get a leaf much faster with a single read (that does not verify) by calling `mmr._getNodeValue(MMR.getNodePosition(leafIndex))`

### Contributing

How to contribute, build and release are outlined in [CONTRIBUTING.md](https://github.com/zmitton/pristine/blob/master/CONTRIBUTING.md), [BUILDING.md](https://github.com/zmitton/pristine/blob/master/BUILDING.md) and [RELEASING.md](https://github.com/zmitton/pristine/blob/master/RELEASING.md) respectively. Try to follow the [CONVENTIONAL_COMMITS.md](https://github.com/zmitton/pristine/blob/master/CONVENTIONAL_COMMITS.md) specification.

Using semantic versioning (more info [here](https://github.com/zmitton/pristine/blob/master/VERSIONING.md))

Testing uses mocha. It should work to simply pull down the repo, do an `npm install`, and use `npm run test` to run the tests.
