const WORD_SIZE = 64

class MemoryBasedDb extends Array {
  constructor(){
    super(0)
    Object.defineProperty(this, leafLength, { value: 0, writable: true })
  }

  async get(index){
    return this[index] || Buffer.alloc(WORD_SIZE)
  }
  async set(index, value){
    return this[index] = hash
  }

  async getLeafLength(){
    return this.leafLength
  }
  async setLeafLength(leafLength){
    return this.leafLength = leafLength
  }
}

module.exports = MemoryBasedDb


// const WORD_SIZE = 64

// class sparseDb extends Array {
//   constructor(proof) {
//     this.leaves = proof.leaves
//     this.mountainNodes = proof.mountainNodes
//     this.peakTreeNodes = proof.peakTreeNodes
//     this.root = proof.root
//     this.length = proof.length
//     this.dirty = true
//   }

//   async getMountainNode(index) {
//     return this[index] || Buffer.alloc(WORD_SIZE)
//   }
//   async getLeaf(){

//   }

//   async write(hash, index) {
//     if (index == undefined) {
//       console.log("index not defined")
//       this.push(hash)
//     } else {
//       this[index] = hash
//     }
//     this.dirty = true
//   }

//   async nodeLength() {
//     return this.length
//   }

//   // async leafLength() {
//   //   return this.length
//   // }
// }
