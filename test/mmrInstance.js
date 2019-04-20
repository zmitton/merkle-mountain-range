const assert = require('assert');
assert.rejects = async (promiseThatShouldReject) => {
  await promiseThatShouldReject.then(
    () => { throw new Error('Expected method to reject.') },
    (error) => { assert.strictEqual(!!error, true) }
  )
}

const MMR = require('./../src/mmr')
const Position = require('./../src/position')
const MemoryBasedDb = require('./../src/db/memoryBasedDb')
const { keccak256FlyHash }   = require('../src/digests')
const expect = require('chai').expect;

const etcLeafData = require('./fixtures/etcLeafData')

describe('MerkleMountinRange (MMR) instance/async functions', () => {
  let mmr, proofMmr

  context('#append', () => {
    it('create an mmr with some leaves; check leaf/node lengths', async () => {
      mmr = new MMR(keccak256FlyHash)
      let b = Date.now()
      await mmr.appendMany(etcLeafData)
      assert.strictEqual(await mmr.getNodeLength(), 1994) // observation only
      assert.strictEqual(await mmr.getLeafLength(), 1000)
      console.log("    Time for 1 append (0-1000) = ", ((Date.now() - b) / 1000) / etcLeafData.length)
    })
  })

  context('#get', () => {
    it('a few targeted `get`s 0, 1, 3, 8 ...999', async () => { 
      assert.strictEqual(await mmr.get(0), etcLeafData[0])
      assert.strictEqual(await mmr.get(1), etcLeafData[1])
      assert.strictEqual(await mmr.get(3), etcLeafData[3])
      assert.strictEqual(await mmr.get(8), etcLeafData[8])
      assert.strictEqual(await mmr.get(10), etcLeafData[10])
      assert.strictEqual(await mmr.get(45), etcLeafData[45])
      assert.strictEqual(await mmr.get(409), etcLeafData[409])
      assert.strictEqual(await mmr.get(671), etcLeafData[671])
      assert.strictEqual(await mmr.get(998), etcLeafData[998])
      assert.strictEqual(await mmr.get(999), etcLeafData[999])
    })
    it('`get`s every item from etcLeafData individually', async () => {
      let b = Date.now()
      for (let i = 0; i < etcLeafData.length; i++) {
        const leaf = await mmr.get(i)
        assert.strictEqual(leaf, etcLeafData[i])
      }
      console.log("    Time for 1 get (1000 leaves) = ", ((Date.now() - b) / 1000) / etcLeafData.length)
    })
  })

  context('#_getNodeValue', () => {
    it('get node index 2, which is the hash of 0 and 1', async () => {
      let expectedNode2Value = '8749599828a524ab56cc1fdf5b3676b0318d0825ac027dbca5544adb18b07b9e00000000000000000000000000000000000000000000000000000007ff800000'
      let computedNode2Value = await mmr._getNodeValue(new Position(2, 1, false))
      assert.strictEqual(computedNode2Value.toString('hex'), expectedNode2Value)
    })
  })

  context('#getRoot', () => {
    it('current/final root is returned when no arguments are given', async () => {
      // difficulty at block 999 is 21991996248790 -> 0x1400691fd2d6
      let expectedFinalRootValue = '1d6e5c69d70d3ac8847ccf63f61303f607382bd988d0d8b559ce53e3305e7b6700000000000000000000000000000000000000000000000000001400691fd2d6'
      let computedFinalRoot = await mmr.getRoot()
      let computed999thRoot = await mmr.getRoot(999)
      assert.strictEqual(computedFinalRoot.toString('hex'), expectedFinalRootValue)
      assert.strictEqual(computed999thRoot.toString('hex'), expectedFinalRootValue)
    })
    it('root of 0rd leaf should be the hash of node 0', async () => {
      let node0 = await mmr.db.get(0)
      let root0 = await mmr.getRoot(0)
      assert.strictEqual(root0.toString('hex'), '4ef0d4100c84abf7f877cde7ae268676b3bab9341cdac33ae7c5de5ca8d865660000000000000000000000000000000000000000000000000000000400000000')
      assert.strictEqual(root0.toString('hex'), keccak256FlyHash(node0).toString('hex'))
    })
    it('root of 1rd leaf should be the hash of node 2', async () => {
      let node2 = await mmr.db.get(2)
      let root1 = await mmr.getRoot(1)
      assert.strictEqual(root1.toString('hex'), 'b31315e249f2d6814113099367c3ab9092eb94a9e6ea2f3539b78a2da8589ee400000000000000000000000000000000000000000000000000000007ff800000')
      assert.strictEqual(root1.toString('hex'), keccak256FlyHash(node2).toString('hex'))
    })
    it('root of 2rd leaf should be the hash of nodes 2 and 3', async () => {
      let node2 = await mmr.db.get(2)
      let node3 = await mmr.db.get(3)
      let root2 = await mmr.getRoot(2)
      assert.strictEqual(root2.toString('hex'), '76bf715a5208daa07aabcd414d6759ad6e55254617909235730c17089153e2bc0000000000000000000000000000000000000000000000000000000bfe801000')
      assert.strictEqual(root2.toString('hex'), keccak256FlyHash(node2, node3).toString('hex'))
    })
    it('root of 3rd leaf should be the hash of node 6', async () => {
      let node6 = await mmr.db.get(6)
      let root3 = await mmr.getRoot(3)
      assert.strictEqual(root3.toString('hex'), 'c1371662e5123efcdf1d1fa786d040b8434df32e9af9e1e25c34dcde5332f14b0000000000000000000000000000000000000000000000000000000ffd003ffe')
      assert.strictEqual(root3.toString('hex'), keccak256FlyHash(node6).toString('hex'))
    })
    it('root of 4rd leaf should be the hash of nodes 6 and 7', async () => {
      let node6 = await mmr.db.get(6)
      let node7 = await mmr.db.get(7)
      let root4 = await mmr.getRoot(4)
      assert.strictEqual(root4.toString('hex'), 'b25df4fe1d364645020187f1ce1b2ec15fb5a4bb26075458d230dfe28dc395b600000000000000000000000000000000000000000000000000000013fb009ff7')
      assert.strictEqual(root4.toString('hex'), keccak256FlyHash(node6, node7).toString('hex'))
    })

    it('root of 59rd leaf should be the hash of nodes 62, 93, 108, 115  ', async () => {
      let node62 = await mmr.db.get(62)
      let node93 = await mmr.db.get(93)
      let node108 = await mmr.db.get(108)
      let node115 = await mmr.db.get(115)
      let root59 = await mmr.getRoot(59)
      assert.strictEqual(root59.toString('hex'), '5847b83a713a3da7cadf901093768652f0eb9b2fb058e67961434ec5b7bf34ae000000000000000000000000000000000000000000000000000000f1fba4e525')
      assert.strictEqual(root59.toString('hex'), keccak256FlyHash(node62, node93, node108, node115).toString('hex'))
    })
    it('root of 22rd leaf should be the hash of nodes 30, 37, 40, 41  ', async () => {
      let node30 = await mmr.db.get(30)
      let node37 = await mmr.db.get(37)
      let node40 = await mmr.db.get(40)
      let node41 = await mmr.db.get(41)
      let root22 = await mmr.getRoot(22)
      assert.strictEqual(root22.toString('hex'), '92d471d2d496e5852cb37fc14c8495e32e327ee73a4ccc86679d58480ee55afa0000000000000000000000000000000000000000000000000000005c0480cf27')
      assert.strictEqual(root22.toString('hex'), keccak256FlyHash(node30, node37, node40, node41).toString('hex'))
    })
  })

  context('#delete', () => {
    it('should be able to delete everything after leaf 33', async () => {
      let oldLeafLength = await mmr.getLeafLength()
      assert.strictEqual(oldLeafLength, etcLeafData.length)
      await mmr.get(34) // should not reject
      await mmr.delete(34)
      await assert.rejects(mmr.get(34)) // should reject (34 has been deleted)
      await assert.rejects(mmr.get(35)) // everything after 34 also deleted
      await assert.rejects(mmr.get(36))
      await mmr.get(33) // should not reject
      let newLeafLength = await mmr.getLeafLength()
      assert.strictEqual(newLeafLength, 34)
    })
  })

  context('#getProof', () => {
    it('should build and return a proof tree', async () => {
      proofMmr = await mmr.getProof([18]) 
      assert.deepEqual(Object.keys(proofMmr.db.nodes), [30, 33, 34, 35, 44, 60, 65])
      
      await proofMmr.get(18) // should not reject
      await proofMmr.get(19) // the sibling leaf is also contained in the proof
      await assert.rejects(proofMmr.get(17)) // insufficient to prove any other leaves
      await assert.rejects(proofMmr.get(20)) // insufficient to prove any other leaves

      proofMmr.db.nodes[31] = etcLeafData[16]
      await assert.rejects(proofMmr.get(16)) // insufficient to prove any other leaves
      proofMmr.db.nodes[32] = etcLeafData[17]
      await proofMmr.get(16) // sufficient now to prove leaves 16 and 17
      await proofMmr.get(17)

    })
  })

  context('#_getNodeValue', () => {
    it('has implied node through recursive method on sparce tree', async () => {

      let node45 = await proofMmr._getNodeValue(new Position(45, 3, false))
      await assert.rejects(proofMmr._getNodeValue(new Position(13, 2, true)))

      assert.strictEqual(node45.toString('hex'), 'c61c4b29aaec6f0a2fedafd23fb6a4559d66f46c8ff393de7ec6ebd3d8f6a6ca000000000000000000000000000000000000000000000000000000201603ff18')
    })
  })
})

  // getRoot getNodeLength getLeafLength delete getProof _getNodeValue _hasNode _verifyPath _setLeafLength _hashUp