const assert = require('assert')
const fileSystem = require('fs') 
assert.rejects = async (promiseThatShouldReject) => {
  await promiseThatShouldReject.then(
    () => { throw new Error('Expected method to reject.') },
    (error) => { assert.strictEqual(!!error, true) }
  )
}
const MMR = require('./../src/merkleMountainRange')
const Position = require('./../src/position')
const MemoryBasedDb = require('./../src/db/memoryBasedDb')
const FileBasedDb = require('./../src/db/fileBasedDb')
const LevelDbBasedDb = require('./../src/db/levelDbBasedDb')
const { keccak256FlyHash }   = require('../src/digests')

describe('MerkleMountinRange (MMR) instance/async functions', () => {
  let fileBasedMmr, levelDbBasedMmr, mmr, proofMmr
  let levelDbBasedDb
  let etcLeafData = []

  context('#append', () => {
    it('open a file based mmr; check leaf/node lengths', async () => {
      let fileBasedDb = FileBasedDb.open('./test/fixtures/etcLeafDataFile.mmr')
      fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb)
      let nodeLength = await fileBasedMmr.getNodeLength()
      let leafLength = await fileBasedMmr.getLeafLength()
      assert.strictEqual(leafLength, 1000)
      assert.strictEqual(nodeLength, 1994) // observation only
    })

    it('create an in-memory mmr with some leaves for testing; check leaf/node lengths', async () => {
      mmr = new MMR(keccak256FlyHash)

      for (var i = 0; i < 1000; i++) {
        let leaf = await fileBasedMmr.db.get(MMR.getNodePosition(i).i)
        etcLeafData.push(leaf) // for testing against later
        await mmr.append(leaf, i)
      }
      let nodeLength = await fileBasedMmr.getNodeLength()
      let leafLength = await fileBasedMmr.getLeafLength()
      assert.strictEqual(leafLength, 1000)
      assert.strictEqual(nodeLength, 1994) // observation only
    })
  })

  context('BENCHMARKS', () => {
    it('performance/timing', async () => {
      let tempMmr = new MMR(keccak256FlyHash)
      let b
      let NUM_LOOPS = 250

      b = Date.now()
      for (var i = 0; i < NUM_LOOPS; i++) {
        await mmr.get(i)
      }
      console.log("      Seconds for 1 memoryBased get ( ~250  leaves)       ", ((Date.now() - b) / 1000) / NUM_LOOPS)
      
      b = Date.now()
      for (var i = 0; i < NUM_LOOPS; i++) {
        let leaf = await fileBasedMmr.db.get(MMR.getNodePosition(i).i)
        await tempMmr.append(leaf, i)
      }
      console.log("      Seconds for 1 memoryBased append (0 to 250  leaves) ", ((Date.now() - b) / 1000) / NUM_LOOPS)

      b = Date.now()
      for (var i = 0; i < NUM_LOOPS; i++) {
        await fileBasedMmr.get(i)
      }
      console.log("      Seconds for 1 fileBased get (tree ~250  leaves)     ", ((Date.now() - b) / 1000) / NUM_LOOPS)

      let leaf = await fileBasedMmr.get(0)
      let tempFileBasedDb = FileBasedDb.create('./test/temp.mmr', 64)
      let tempFileBasedMmr = new MMR(keccak256FlyHash, tempFileBasedDb)

      await tempFileBasedMmr.delete(0) // reset database
      b = Date.now()
      for (var i = 0; i < NUM_LOOPS; i++) {
        await tempFileBasedMmr.append(leaf)
      }
      console.log("      Seconds for 1 fileBased append (tree ~250  leaves)  ", ((Date.now() - b) / 1000) / NUM_LOOPS)

      levelDbBasedDb = await LevelDbBasedDb.openOrCreate('./test/etcLeafDataLevelDb', Buffer.from('c12f','hex'))
      levelDbBasedMmr = new MMR(keccak256FlyHash, levelDbBasedDb)

      assert.equal(await levelDbBasedDb.getLeafLength(), 0)
      // await levelDbBasedMmr.delete(0) // reset database
      b = Date.now()
      for (var i = 0; i < NUM_LOOPS; i++) {
        await levelDbBasedMmr.append(etcLeafData[i])
      }
      console.log("      Seconds for 1 levelDbBased append (tree ~250 leaves)", ((Date.now() - b) / 1000) / NUM_LOOPS)

      b = Date.now()
      for (var i = 0; i < NUM_LOOPS; i++) {
        await levelDbBasedMmr.get(i)
      }
      console.log("      Seconds for 1 levelDbBased get (tree ~250 leaves)   ", ((Date.now() - b) / 1000) / NUM_LOOPS)
      assert.equal(await levelDbBasedDb.getLeafLength(), 250)
      assert.strictEqual( etcLeafData[0].equals(await levelDbBasedMmr.get(0)), true)
      assert.strictEqual( etcLeafData[1].equals(await levelDbBasedMmr.get(1)), true)
      assert.strictEqual( etcLeafData[3].equals(await levelDbBasedMmr.get(3)), true)
      assert.strictEqual( etcLeafData[8].equals(await levelDbBasedMmr.get(8)), true)
      assert.strictEqual( etcLeafData[10].equals(await levelDbBasedMmr.get(10)), true)
      assert.strictEqual( etcLeafData[45].equals(await levelDbBasedMmr.get(45)), true)

    })
  })

  after(function(done){
    if (fileSystem.existsSync('./test/temp.mmr')) {
      let error = fileSystem.unlinkSync('./test/temp.mmr')
      if(error){
        throw error
      }
    }
    if (fileSystem.existsSync('./test/etcLeafDataLevelDb')) {
      levelDbBasedDb.levelDb.clear(function(e){
        if(e){
          throw e
        }
        done()
      })
    }else{
      done()
    }
  })

  context('#get', () => {
    it('a few targeted `get`s 0, 1, 3, 8 ...999', async () => { 
      assert.strictEqual( etcLeafData[0].equals(await mmr.get(0)), true)
      assert.strictEqual( etcLeafData[1].equals(await mmr.get(1)), true)
      assert.strictEqual( etcLeafData[3].equals(await mmr.get(3)), true)
      assert.strictEqual( etcLeafData[8].equals(await mmr.get(8)), true)
      assert.strictEqual( etcLeafData[10].equals(await mmr.get(10)), true)
      assert.strictEqual( etcLeafData[45].equals(await mmr.get(45)), true)
      assert.strictEqual( etcLeafData[409].equals(await mmr.get(409)), true)
      assert.strictEqual( etcLeafData[671].equals(await mmr.get(671)), true)
      assert.strictEqual( etcLeafData[998].equals(await mmr.get(998)), true)
      assert.strictEqual( etcLeafData[999].equals(await mmr.get(999)), true)
    })
    it('`get`s every item from etcLeafData individually', async () => {
      let b = Date.now()
      for (let i = 0; i < etcLeafData.length; i++) {
        const leaf = await mmr.get(i)
        assert.strictEqual(etcLeafData[i].equals(leaf), true)
        assert.strictEqual(leaf, etcLeafData[i])
      }
      // console.log("    Time for 1 fileBased get and then 1 memoryBased append (250  leaves) = ", ((Date.now() - b) / 1000) / etcLeafData.length)
    })
  })

  context('#_getNodeValue', () => {
    it('get node index 2, which is the hash of 0 and 1', async () => {
      let expectedNode2Value = '8749599828a524ab56cc1fdf5b3676b0318d0825ac027dbca5544adb18b07b9e00000000000000000000000000000000000000000000000000000007ff800000'
      let computedNode2Value = await mmr._getNodeValue(new Position(2, 1, false))
      assert.strictEqual(computedNode2Value.toString('hex'), expectedNode2Value)
    })
    it('get node index 61, which is the hash of 45 and 60', async () => {
      let expectedNode2Value = '7fc8112768dccd0e5444e7fb0f36c1b1cc1990395695537ca2a3e30b12bd2421000000000000000000000000000000000000000000000000000000404c2c0f34'
      let computedNode2Value = await mmr._getNodeValue(new Position(61, 4, true))
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
      // console.log(proofMmr)
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

  context('#serialize, #fromSerialized', () => {
    it('should build and return a proof tree', async () => {
      proofMmr = await mmr.getProof([18]) 
      let serialied = await proofMmr.serialize()
      let dbFromSerialized = MemoryBasedDb.fromSerialized(serialied)
      let mmrFromSerialized = MMR.fromSerialized(proofMmr.digest, serialied)
      // console.log("dbFromSerialized ", dbFromSerialized)
      // console.log("mmrFromSerialized ", mmrFromSerialized)
      // console.log("proofMmr.db", proofMmr.db)
      assert.deepEqual(proofMmr.db, dbFromSerialized)
      assert.deepEqual(proofMmr.db, mmrFromSerialized.db)

      let dataFromGolangImplementation = `f901e722f901e3f8432cb8405b3913c31a16b669b5630be116285cc03ee8d5cdfdd6bf975092c5a25d2434c7000000000000000000000000000000000000000000000000000000100f047fc8f84322b840480ff3f8a495b764e4361a6c2e296f34e8721cf1ec54fe5c46827937353bf1180000000000000000000000000000000000000000000000000000000401ffefcdf84341b840276b0cdd50d55b2d9fb229b4a8ff08831678949cd41eadca0af142bee8f06d6c0000000000000000000000000000000000000000000000000000000812936bdcf8433cb840e6dd80f5983f930ddd64d34886ee3ca3daa3761f835c5ee72a4a35ae7b7a27d8000000000000000000000000000000000000000000000000000000203628101cf84321b840fbc5eb6b0c8a2b0be83bfde711eef57782d6c4a8949bfe51233015d2b63a77c900000000000000000000000000000000000000000000000000000008027f5fb9f84323b840ec888de9fa46cb7a47b7bd812a2f601d948d89e5317cf9f68976a0dec92b1ee20000000000000000000000000000000000000000000000000000000402802fcaf8431eb8409dd966e87aaf98d54442be98dd9b9f195e7dedf913d21c12e9df5250b005dc330000000000000000000000000000000000000000000000000000003ff2fea031`
      let goSerialized = Buffer.from(dataFromGolangImplementation, 'hex')
      let dbFromGo = MemoryBasedDb.fromSerialized(goSerialized)
      // console.log("dbFromGo ", dbFromGo)
      // console.log("proofMmr.db ", proofMmr.db)
      assert.deepEqual(proofMmr.db, dbFromGo)
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




