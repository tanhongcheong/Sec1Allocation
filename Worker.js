import { Posting } from './Posting.js';

self.onmessage = (e) => {
    console.log("on message");
    console.log(e.data);
    let posting = new Posting(
        e.data.postingFileBinary,
        e.data.additionalDataFileBinary,
        e.data.stats,
        e.data.blocks
    );
    posting.addEventListener("allocated", (event) => {
        postMessage(event.detail);
    });
    const numberNotAllocated = posting.allocateStudents();
    console.log(numberNotAllocated,"students not allocated");
    //posting.saveAllocation("testing.xlsx");
    console.log("done");
};