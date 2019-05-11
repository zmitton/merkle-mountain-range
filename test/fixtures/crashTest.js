const assert = require('assert');
const MMR = require('./../../src/merkleMountainRange')
const Position = require('./../../src/position')
const MemoryBasedDb = require('./../../src/db/memoryBasedDb')
const FileBasedDb = require('./../../src/db/fileBasedDb')
const { keccak256FlyHash }   = require('../../src/digests')
    // "crashtest": "node test/fixtures/crashTest.js"

let appendLoop = async () => {

  let readOnlyDb = new FileBasedDb('./test/fixtures/etcLeafData.mmr')
  let readOnlyMmr = new MMR(keccak256FlyHash, readOnlyDb)
  let leaf = await readOnlyMmr.get(0)

  let db = new FileBasedDb('./test/fixtures/crashTestDb.mmr') // writing
  let mmr = new MMR(keccak256FlyHash, db)


  let t = Date.now() + (5 * 1000)
  while(Date.now() < t){
    await mmr.append(leaf)
  }
}

appendLoop()
