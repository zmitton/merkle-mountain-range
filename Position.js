// structure to hold a node's position.
// lazily computes height/rightness
class Position{
  constructor(index, height, rightness){
    this.index = index 
    this.height = height
    this.rightness = rightness

    Object.defineProperty(this, 'i', {
      get: () => { return this.index },
    })
    Object.defineProperty(this, 'h', {
      get: () => { 
        return this.height ? this.height : this.height = MMR.height(this.i) 
      },
    })
    Object.defineProperty(this, 'r', {
      get: () => { // whether it is a right edge - `true` or a left edge - `false`
        if(this.rightness === undefined){
          return this.rightness = MMR.rightness(this.i)
        } else {
          return this.rightness
        }
      },
    })
  }
}

module.exports = Position


  // async _put(value, i){ // has been combined into `put`
  //   let length = await this.db.nodeLength()
  //   // let nodePairs = MMR.branchNodes(length, i)
  //   await this.db.write(value, i)
  //   // console.log("HHHHH", nodePairs, length, i)
  //   return this._hashUp( MMR.branchNodes(length, i))
  // }



  // static getLeafIndex(nodeIndex){
  //   let leafIndex = 0
  //   // let peak = this.peak(nodeIndex)
  //   while(exponent >= 0){

  //   }
  //   return leafIndex
  // }



  
