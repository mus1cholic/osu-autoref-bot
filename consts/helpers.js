function printStringArray(arr) {
    const ret = "";
    
    for (const [i, v] of arr.entries()) {
        if (i === arr.length - 1) ret += v

        ret += v + ", ";
    }

    return ret;
}

module.exports = {
    printStringArray
};