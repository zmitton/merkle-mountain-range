

// class Node{
//   constructor(index, value, height){
//     this.index = index
//     this.value = value
//     this.height = height
//   }
//   getHeight(){
//     if(this.height){
//       return this.height
//     }else{
//       let h = 1
//       while(2**h-1 <= this.index){ h++ }
//       while(h > 0){
//         if(2**h-1 < this.index){
//           this.index = this.index - (2**h-1)
//         } 
//         if(2**h-1 == this.index){
//           return h - 1
//         }
//         h--
//       }
//     }
//   }
// }
