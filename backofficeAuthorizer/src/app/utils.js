function arraysOverlap(arrayA, arrayB) {
  // Function that checks if two arrays contains overlapping values
  if (arrayA.length === 0 || arrayB.length === 0) {
    return false;
  } else {
    for (let value of arrayA) {
      if (arrayB.includes(value)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = { arraysOverlap };
