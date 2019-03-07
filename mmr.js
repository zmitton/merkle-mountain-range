// fs.writeFile('thing1',Buffer.from('34','hex'), (e,r,a)=>{console.log(e,r,a)})

class MMR extends Array{
  constructor(){
    super(0)
  }

  put(value){ // puts at the end ONLY
    let proofIndices = MMR.proofIndices(this.length)
    this.push(value)
    for (var i = 0 ; i < proofIndices.length; i++) {
      this.push(MMR.hash(proofIndices[i][0], proofIndices[i][1]))
    }
  }

  static proofIndices(length){ // indexes to hash after update (at the end ONLY)
    let indices = []
    while(this.isRight(length)){
      indices.push([this.leftSib(length), length])
      length++
    }
    return indices
  }

  static get(n){ // index of nth leaf
    let total = 0
    let ph = this.peakHeight(n-1) + 1
    while(ph >= 0){
      if(n >= 2**ph){
        total += 2**(ph+1)-1
        n -= 2**ph
      }
      ph--
    }
    return total
  }

  static touch(n, peakIndexOfN){ // array of indexes traversed from peak
    let h = peakHeight(i)

  }

  static bagPeaks(length){

    // peakIndices(length)
  }


  static leftSib(i){
    return i + 1 - 2**(this.height(i) + 1)
  }
  static rightSib(i, h){
    return i + 2**(this.height(i) + 1) - 1
  }

  static isRight(i){
    let ph = this.peakHeight(i)
    while(ph > - 2){
      if(2**(ph+2) - 2 == i){
        return false
      }
      if(2**(ph+2) - 2 < i){
        i = i - (2**(ph+2) - 1)
      } 
      if(2**(ph+2) - 2 == i){
        return true
      }
      ph--
    }
  }
  static _isCorrupt(length){ // final node should always be "Left"
    return this.isRight(length-1)
  }

  static peakIndices(length){
    let indices = []
    let shift = 0
    let peak
    do {
      peak = this.peak(length-1)
      indices.push(shift + peak)
      shift = peak+1
      length = length - shift
    } while (length > 0)
    return indices
  }

  static peakHeight(i){ // i must be of a leaf node
    let exponent = 0
    while(2**exponent - 3 < i){ exponent++ }
    return exponent - 2
  }
  static peak(i){ // i must be of a leaf node
    return 2**(this.peakHeight(i)+1) - 2
  }
  static height(i){ // i must be of a leaf node
    let ph = this.peakHeight(i)
    while(ph > - 2){
      if(2**(ph+2) - 2 < i){
        i = i - (2**(ph+2) - 1)
      } 
      if(2**(ph+2) - 2 == i){
        return ph + 1
      }
      ph--
    }
  }
  static hash(a,b) {
    return "h("+a+","+b+")"
  }
}

r = new MMR()
r.put(0)
r.put(1)
r.put(3)
r.put(4)
r.put(7)
r.put(8)
r.put(10)
r.put(11)
r.put(15)
r.put(16)
r.put(18)



