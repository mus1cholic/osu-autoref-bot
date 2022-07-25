function printStringArray(arr) {
    let ret = "";
    
    for (const [i, v] of arr.entries()) {
        if (i === arr.length - 1) {
            ret += v;
            break;
        }

        ret += v + ", ";
    }

    return ret;
}

module.exports = {
    printStringArray
};