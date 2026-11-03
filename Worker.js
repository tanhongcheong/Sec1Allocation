import { Posting } from './Posting.js';

self.onmessage = (e) => {
    let posting = new Posting(
        e.data.postingFileBinary,
        e.data.mdlFileBinary,
        e.data.additionalDataFileBinary,
        e.data.stats,
        e.data.blocks
    );
    

    posting.addEventListener("allocated", (event) => {
        postMessage(event.detail);
    });
    const numberNotAllocated = posting.allocateStudents();
    console.log(numberNotAllocated,"students not allocated");
    //posting.saveAllocation("testing.xlsx");*/
    console.log("done");
};