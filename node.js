class Node{
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

module.exports = Node
