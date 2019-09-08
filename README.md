# <img src="img/logo.png" alt="alt text" width="100" height="whatever"> Merkle Mountain Range

A type of merkle tree that can be visualized as many (perfect) merkle trees which are then combined into 1, by creating a single root from all of their peaks. The rules for making the tree(s) however are rigidly deterministic such that the entire structure depends only on the number of items put into it. When appending leaves, nodes are not updated, only appended. This makes for a minimal amount of total hash computations (~2n), while maintaining the property that no nodes are updated when appending new leaves (nodes are merely added). Because of this, the _merkle inclusion proofs_ are _also_ only appended to meaning that later proofs are sufficient (supersets of) earlier proofs.

A Golang version of this can be found [here](https://github.com/zmitton/go-merklemountainrange).

These unique properties make it optimal for proving the work of an entire PoW blockchain. A protocol that does this is [FlyClient](https://www.youtube.com/watch?v=BPNs9EVxWrA).

![alt text](img/mmr.png "MMR graphical representation")

## Resources 

MMR data structure as described by Peter Todd:
([Reyzin and Yakoubov](https://eprint.iacr.org/2015/718.pdf) may have proposed at a similar data structure in 2015)
 
 - [Basics](https://github.com/opentimestamps/opentimestamps-server/blob/master/doc/merkle-mountain-range.md)
 - [Detailed properties and python code](https://github.com/proofchains/python-proofmarshal/blob/master/proofmarshal/mmr.py)
 - [implimentation / feture recomendations](https://github.com/mimblewimble/grin/blob/master/doc/mmr.md)
 - [an early proposed application](https://lists.linuxfoundation.org/pipermail/bitcoin-dev/2016-May/012715.html)

I have improved the structure slightly from the above references (by simplifying it). The difference is in the "bagging the peaks" process (used to calculate the merkle-root). Todd's process takes the peaks and creates another merkle tree from them in order to attain a single root. My process is to simply digest the peaks as a single concatenated array to attain a single root.

Why?

1. Using Todd's process it was ([by his own admission](https://github.com/proofchains/python-proofmarshal/blob/master/proofmarshal/mmr.py#L139)) very difficult to logically determine leaf position from an inclusion proof.

2. The `getRoot` method concatenates the peaks and hashes them on the fly (the root is never persisted). This process is very cheap because there are only ~log(n)/2 peaks.



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

With 1000 64-byte leaves (2015 macbookpro)
 - MemoryBasedDb
   - Time per `append()` =  0.000119s
   - Time per `get()` =  0.000289s
   - Time per `mmr._getNodeValue(MMR.getNodePosition(leafIndex))` about 0.00002
 - FileBasedDb
   - Time per `append()` =  0.000301s
   - Time per `get()` =  0.000719s
   - Time per `mmr._getNodeValue(MMR.getNodePosition(leafIndex))` about 0.00004

The cost of `mmr.get(leafIndex)` can be reduced by instead using `mmr._getNodeValue(MMR.getNodePosition(leafIndex))`. Because `get()` verifies as it traverses down the tree. Makes it easy to not mess up verification. You can technically get a leaf much faster with a single read (that does not verify) by calculating the position and reading it directly (O(1) instead of O(logn)).

### Contributing

How to contribute, build and release are outlined in [CONTRIBUTING.md](https://github.com/zmitton/pristine/blob/master/CONTRIBUTING.md), [BUILDING.md](https://github.com/zmitton/pristine/blob/master/BUILDING.md) and [RELEASING.md](https://github.com/zmitton/pristine/blob/master/RELEASING.md) respectively. Try to follow the [CONVENTIONAL_COMMITS.md](https://github.com/zmitton/pristine/blob/master/CONVENTIONAL_COMMITS.md) specification.

Using semantic versioning (more info [here](https://github.com/zmitton/pristine/blob/master/VERSIONING.md))

Testing uses mocha. It should work to simply pull down the repo, do an `npm install`, and use `npm run test` to run the tests.


#### Changelog V0 -> V1

 - `.mmr` file has slightly different (incompatible) format to store `wordsize` (which is no longer locked to 64 bytes)
 - FileBasedDb must now be created using `.open` or `.create`. `.open` takes an additional `wordSize` argument (default = 64 bytes)
 - Support for serialized proof tree (or sparse tree)
 <!-- 4 - Refactor of `MMR` class methods into the `Position` class instead. -->
 <!-- 5 - New `_getLeafIndex(nodeIndex)` and `NewPosition(positionIndex)` functions -->
 - `Digests` has been deprecated (now `_Digests`) because it doesn't belong in this repo. You should include your own hash function package. If it does not have the required function signature - i.e: `<buffer>` in `<buffer>` out, then you will have to wrap in in one that does before using it. The digest functions used in Flyclient will be available through a seperate "flyclient" npm package.


### Merkle Proofs & Serialization Format


The most elegant way of dealing with merkle-proofs is to basically think of them as a sparse tree in which only _some_ of its nodes are present. As long as while performing a `get` the software walks from peak to leaf checking each hash properly matches its children along the way, this proves inclusion before returning the leaf. If any node required in this path traversal is not present, the sparse tree is _insufficient_ to prove this particular leaf (software currently throws Missing node error); If any hash does not match its parents, the proof is _fraudulent_ (throws Hash mismatch error).


The merkle Proof data is essentially the same data of a regular MMR (leafLength and nodes) except with only _some_ of the nodes (rather than of all of them). For example the data of a sprase mmr might look like this:

```
leafLength: 34
nodes:
  { 
    30 : <12 34 56 78 90>,
    32 : <12 34 12 34 34>,
    33 : <21 43 65 87 09>
  }
```
(whereas a similar _full_ mmr of length 34 would contain all the nodes from 0-33)

To serialize this data for remote transmission  we first arrange it into very specifically arranged arrays (of byte arrays) for RLP encoding. On the other end, the software knows that the zeroith item is leafLength and the first item is an array of nodes (in which each node is of length 2 to represent the node key pairs):

```
[
  <22>,
  [ <1e>, <12 34 56 78 90> ],
  [ <20>, <12 34 12 34 34> ],
  [ <21>, <21 43 65 87 09> ]
]
```

Finally we can `rlp.encode()` this data:

```
<d9 22 c7 1e 85 12 34 56 78 90 c7 20 85 12 34 12 34 34 c7 21 85 21 43 65 87 09>

```
`rlp.decode()` gets you exactly back to the above arrays, and the software can reinterpret the items as described above to rebuild the sparse tree. Note that these serialized bytes can be passed from Golang package to JS package and vise-versa!


#### NOTES (mostly to self):

there probably should be a whole framework for requesting more nodes (to complete insufficient proofs). A few ideas on this.

 - somehow the verifier must get the `diff`of node positions that is has, vs ones that it needs.
 - it would be maximally flexible to be able to request individual nodes - so we need a `getNodes(nodeIndexes)` method that the prover can use to return them.
 - however it would often be more concise to request particular leafIndexes and the prover would calculate which nodes to return to satisfy that. Of course this would likely return some nodes the verifier already has (like always the peaks).
 - It would be useful for these requests to include the `leafLength` AND the `root` which would LOCK the prover to an EXACT response any variation from which would be known to be fraudulent (without this, the prover could return nodes from some different tree that it genuinely thinks you are talking about (for instance a different micro-fork/re-org in our blockchain context)).

<!-- Asking myslef
 - how would the remote abstraction (of haivng a prover) be best designed? Would it be another layer on the database where it knows to remotely request/receive the extra nodes when it doesn't have them, and it saves them in the memory-db layer after it gets them? -->

