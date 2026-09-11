import * as XLSX from './xlsx.mjs';
import headers from "./headers.json" with { type: "json" };
import { getPrimarySchools } from './Utilities.js';

export class Posting extends EventTarget
{
    //the list of all students
    #students;
    //the list of all primary schools
    #primarySchools;
    //the relevant constraints for each block
    #blocks;
    //the list of class names
    #classNames;
    //the statistics used to calculate score
    #stats;
    //the list of all AGG-T in the class
    //used to calculate class average AGG-T
    #classAggregates;

    /**
     * 
     * @param {raw xlsxBinaryFile} postingFileBinary the binary content of the posting file
     * @param {raw xlsxBinaryFile} additionalDataFileBinary the binary content of the addition data file
     * @param {JSON} stats the JSON object that contains the columns to be used to calculate score
     * @param {Array} blocks the JSON object that contains the blocks and the constraint for each block
     */
    constructor(postingFileBinary,additionalDataFileBinary,stats,blocks)
    {
        super();
        //read the posting file
        this.#students = this.#readPosting(postingFileBinary);  
        for(let student of this.#students)
        {
            const ic = student["NRIC"];
            //the additional information
            student["ENGLISH_LEVEL"]="";
            student["L2_LEVEL"]="";
            student["MATH_LEVEL"]="";
            student["SCIENCE_LEVEL"]="";
            student["TOTAL_NO_EMS_SBB"]="";
            student["CLASS_ASSIGNED"]="unassigned";
            student["COMMENT"]="";
        }

        //sort the students by nric
        this.#students.sort((a, b) => a["NRIC"].localeCompare(b["NRIC"]));

        if (additionalDataFileBinary!=null)
        {
            //replace data
            this.#replaceData(additionalDataFileBinary);
        }

        //update the SBB information
        this.#populateSBB();

        //get the list of all primary schools
        this.#primarySchools = getPrimarySchools(this.#students);

        //get all the class names
        this.#classNames = new Array();
        for(const block of blocks)
        {
            this.#classNames.push(...block["classNames"])
        }


        //the relevant statistics that is used to calculate score
        this.#stats = new Array();
        //add the count
        for(let stat of stats)
        {
            let s = new Object();
            s.column = stat.column;
            if (stat.equals!=undefined)
            {                
                s.inList = [stat.equals];//equals is the same as exist in list of one element array
                s.flag = true;
            }
            else if (stat.inList!=undefined)
            {
                s.inList = stat.inList;
                s.flag = true;
            }
            else if (stat.notInList!=undefined)
            {
                s.inList = stat.notInList;
                s.flag = false;
            }
            else if (stat.startsWith!=undefined)
            {
                s.startsWith = stat.startsWith;
                s.flag = true;
            }
            else if (stat.doesNotStartWith!=undefined)
            {
                s.startsWith = stat.doesNotStartWith;
                s.flag = false;
            }
            s.counts = new Array(this.#classNames.length).fill(0);
            this.#stats.push(s);
        }
        //add the primary schools as stats
        for(const primarySchool of this.#primarySchools)
        {
            this.#stats.push({column:"PRI-SCH-NAME",inList:[primarySchool],counts:new Array(this.#classNames.length).fill(0)});
        }

        //the list of each AGG-T for each class
        //it used to calculate average AGG-T later
        this.#classAggregates = new Array();
        for(let i=0;i<this.#classNames.length;i++)
        {
            this.#classAggregates.push(new Array());
        }

        //the relevant constraints for each block
        this.#blocks = new Array();
        for(let block of blocks)
        {
            let b = new Object();
            b.name = block.name;
            b.classNames = block.classNames;
            b.constraints = new Array();
            for(let constraint of block.constraints)
            {
                let c = new Object();
                c.column = constraint.column;
                c.number = constraint.number;
                if (constraint.equals!=undefined)
                {
                    c.inList = [constraint.equals];//equals is the same as exist in list of one element array
                    c.flag = true;                    
                }
                else if (constraint.inList!=undefined)
                {
                    c.inList = constraint.inList;
                    c.flag = true;                    
                }
                else if (constraint.notInList!=undefined)
                {
                    c.inList = constraint.notInList;
                    c.flag = false;                    
                }
                else if (constraint.startsWith!=undefined)
                {
                    c.startsWith = constraint.startsWith;
                    c.flag = true;
                }
                else if (constraint.doesNotstartWith!=undefined)
                {
                    c.startsWith = constraint.doesNotstartWith;
                    c.flag = false;
                }
                b.constraints.push(c);
            }
            
            this.#blocks.push(b);
        }
    }

    /**
     * @return the list of students
     */
    getStudents()
    {
        return this.#students;
    }

    /**
     * @return the list of blocks
     */
    getBlocks()
    {
        return this.#blocks;
    }

    /**
     * 
     * @param {String} nric the nric to search
     * @returns the index of the array containing the student with nric
     */
    #getStudentIndex(nric)
    {
        let left = 0;
        let right = this.#students.length-1;
        while(left<=right)
        {
            const middle = Math.floor((left+right)/2);
            const comparison = nric.localeCompare(this.#students[middle]["NRIC"]);
            if (comparison==0)
            {
                return middle;
            }
            else if (comparison<0)
            {
                right = middle-1;
            }
            else
            {
                left = middle+1;
            }
        }
        return -1;
    }

    /**
     * Replace the columns of original excel file with the content found in xlsxBinaryFile
     * @param {raw xlsxBinaryFile} xlsxBinaryFile the xlsx file that contains additional data
     */
    #replaceData(xlsxBinaryFile)
    {
        const workbook = XLSX.read(xlsxBinaryFile, { type: 'array' });	
        // Fetch the name of the first worksheet
        const firstSheetName = workbook.SheetNames[0];	
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        for(let i=0;i<data.length;i++)
        {
            const nric = data[i]["NRIC"];
            const field = data[i]["FIELD"];
            const value = data[i]["VALUE"];
            const index = this.#getStudentIndex(nric);
            if (index==-1)
            {
                console.error("Cannot find ",nric," in replaceData");
            }
            else
            {
                this.#students[index][field] = value;
            }
        }
    }

    /**
     * 
     * @param {raw Buffer} postingFileBinary 
     * @returns array of objects of the posting file content
     */
    #readPosting(postingFileBinary)
    {
        const workbook = XLSX.read(postingFileBinary, { type: 'array' });	
        // Fetch the name of the first worksheet
        const firstSheetName = workbook.SheetNames[0];	
        const worksheet = workbook.Sheets[firstSheetName];
        const namedArray = XLSX.utils.sheet_to_json(worksheet);
        return namedArray;
    }

    /**
     * 
     * @param {string} grade - the grade of the subject
     * @returns true if the subject's grade allows for it to be taken at G3
     */
    #qualifiedForOOSG3(grade)
    {
        //G1 or G2 -> G3 1,2,3,4,5 in the subject
        if (grade==undefined)
        {
            return false;
        }
        const qualifyingGrades = [1,2,3,4,5];
        return qualifyingGrades.indexOf(grade)!=-1
    }

    /**
     * 
     * @param {string} grade - the grade of the subject
     * @returns true if the subject's grade allows for it to be taken at G2
     */
    #qualifiedForOOSG2(grade)
    {
        //G1 -> G2 6 in subject or foundation A
        //by right is <=6 but <=5 also qualified for EXP
        const qualifyingGrades = [6,"A"];
        if (grade==undefined)
        {
            return false;
        }
        return qualifyingGrades.indexOf(grade)!=-1
    }

        /**
     * populate the student's sbb subjects
     * @param {Array} students - the list of students
     */
    #populateSBB()
    {
        for(let student of this.#students)
        {
            let totalEMSSBB = 0;//the student's total number of SBB subjects excluding MT

            const stream = student["POST-CAT"];
            const l1Grade = student["L1_GRADE"];
            const mtGrade = student["MT_GRADE"];
            const scienceGrade = student["SC_GRADE"];
            const mathGrade = student["MATH_GRADE"];
            const l2 = student["SCH_L2_DESC"];
            const l2ThatHasSBB = ["BASIC CHINESE","BASIC MALAY","BASIC TAMIL","CHINESE","MALAY","TAMIL"];
        
            if (stream==="PG3")
            {
                student["ENGLISH_LEVEL"] = "G3";
                student["L2_LEVEL"] = "G3";
                student["MATH_LEVEL"] = "G3";
                student["SCIENCE_LEVEL"] = "G3";
            }
            else if (stream==="PG2")
            {
                student["ENGLISH_LEVEL"] = "G2";
                student["L2_LEVEL"] = "G2";
                student["MATH_LEVEL"] = "G2";
                student["SCIENCE_LEVEL"] = "G2";
                if (this.#qualifiedForOOSG3(l1Grade))
                {
                    student["ENGLISH_LEVEL"] = "G3(SBB)";
                    totalEMSSBB++;
                }
                if (this.#qualifiedForOOSG3(mathGrade))
                {
                    student["MATH_LEVEL"] = "G3(SBB)";
                    totalEMSSBB++;
                }
                if (this.#qualifiedForOOSG3(scienceGrade))
                {
                    student["SCIENCE_LEVEL"] = "G3(SBB)";
                    totalEMSSBB++;
                }
            
                if (l2ThatHasSBB.indexOf(l2)!=-1)
                {
                    if (this.#qualifiedForOOSG3(mtGrade))
                    {
                        student["L2_LEVEL"] = "G3(SBB)";
                        totalEMSSBB++;
                    }
                }
            }
            else if (stream==="PG1")
            {
                student["ENGLISH_LEVEL"] = "G1";
                student["L2_LEVEL"] = "G1";
                student["MATH_LEVEL"] = "G1";
                student["SCIENCE_LEVEL"] = "G1";
                if (this.#qualifiedForOOSG3(l1Grade))
                {
                    student["ENGLISH_LEVEL"] = "G3(SBB)";
                    totalEMSSBB++;
                }
                else if (this.#qualifiedForOOSG2(l1Grade))
                {
                    student["ENGLISH_LEVEL"] = "G2(SBB)";
                    totalEMSSBB++;
                }

                if (this.#qualifiedForOOSG3(mathGrade))
                {
                    student["MATH_LEVEL"] = "G3(SBB)";
                    totalEMSSBB++;
                }
                else if (this.#qualifiedForOOSG2(mathGrade))
                {
                    student["MATH_LEVEL"] = "G2(SBB)";
                    totalEMSSBB++;
                }

                if (this.#qualifiedForOOSG3(scienceGrade))
                {
                    student["SCIENCE_LEVEL"] = "G3(SBB)";
                    totalEMSSBB++;
                }
                else if (this.#qualifiedForOOSG2(scienceGrade))
                {
                    student["SCIENCE_LEVEL"] = "G2(SBB)";
                    totalEMSSBB++;
                }

                if (l2ThatHasSBB.indexOf(l2)!=-1)
                {
                    if (this.#qualifiedForOOSG3(mtGrade))
                    {
                        student["L2_LEVEL"] = "G3(SBB)";
                        totalEMSSBB++;
                    }
                    else if (this.#qualifiedForOOSG2(mtGrade))
                    {
                        student["L2_LEVEL"] = "G2(SBB)";
                        totalEMSSBB++;
                    }
                }
            }
            student["TOTAL_NO_EMS_SBB"] = totalEMSSBB;
        }
    }

    saveAllocation(outFilename)
    {
        const wb = XLSX.utils.book_new();
        //the data sheet
        {
            const ws = XLSX.utils.json_to_sheet(this.#students,{header: headers});
            XLSX.utils.book_append_sheet(wb, ws, "data");
        }

        //temporary add on the unassigned class
        this.#classNames.push("unassigned");

        //add in the classes sheets
        for(const className of this.#classNames)
        {
            let ws = XLSX.utils.aoa_to_sheet([headers]);
            XLSX.utils.book_append_sheet(wb, ws, className);
            const classAssignedColumn = headers.indexOf("CLASS_ASSIGNED");
            const commentColumn = headers.indexOf("COMMENT");
            const arrayRef = "data!A2:"+XLSX.utils.encode_cell({ c: commentColumn, r: this.#students.length});
            const lookupRef = "data!"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: 1 })+":"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: this.#students.length});
            let formula = "_xlfn._xlws.SORT(_xlfn._xlws.FILTER("+arrayRef+","+lookupRef+"=\""+className+"\"),4,1)";
            XLSX.utils.sheet_set_array_formula(ws, "A2", formula, 1);
        }

        //generate the summary sheet
        {    
            const summaryHeader = [
                "Class","Total","PG3","PG2","PG1","Gender:F","Gender:M","DSA:Y","DSA:N","Race:CN","Race:MY","Race:IN","Race:OTHERS","CITIZEN","PR","FOREIGNER","AVG AL SCORE",
                "ENGLISH_G3","ENGLISH_G2","ENGLISH_G1","ENGLISH_G3_SBB","ENGLISH_G2_SBB",
                "L2_G3","L2_G2","L2_G1","L2_G3_SBB","L2_G2_SBB",
                "MATH_G3","MATH_G2","MATH_G1","MATH_G3_SBB","MATH_G2_SBB",
                "SCIENCE_G3","SCIENCE_G2","SCIENCE_G1","SCIENCE_G3_SBB","SCIENCE_G2_SBB"
                ];

            let ws = XLSX.utils.aoa_to_sheet([summaryHeader]);

            for(let i=0;i<this.#classNames.length;i++)
            {
                const r = i+2;      
                XLSX.utils.sheet_add_aoa(ws, [[this.#classNames[i]]], { origin: 'A'+r });

                //list of countif arrary ref, criteria
                const pgColumn = headers.indexOf("POST-CAT");

                const countifs =[
                {colToSearch:"NRIC",criteria:`"<>"`,originCol:"B"},
                {colToSearch:"POST-CAT",criteria:`"PG3"`,originCol:"C"},
                {colToSearch:"POST-CAT",criteria:`"PG2"`,originCol:"D"},
                {colToSearch:"POST-CAT",criteria:`"PG1"`,originCol:"E"},
                {colToSearch:"SEX",criteria:`"F"`,originCol:"F"},
                {colToSearch:"SEX",criteria:`"M"`,originCol:"G"},
                {colToSearch:"DSA_IND",criteria:`"Y*"`,originCol:"H"},
                {colToSearch:"DSA_IND",criteria:`"N"`,originCol:"I"},
                {colToSearch:"PRIMARY_RACE",criteria:`"CN"`,originCol:"J"},
                {colToSearch:"PRIMARY_RACE",criteria:`"MY"`,originCol:"K"},
                {colToSearch:"PRIMARY_RACE",criteria:`"IN"`,originCol:"L"},
                {colToSearch:"CITIZEN_DESC",criteria:`"SINGAPORE CITIZEN"`,originCol:"N"},
                {colToSearch:"CITIZEN_DESC",criteria:`"SINGAPORE PR *"`,originCol:"O"},
                {colToSearch:"ENGLISH_LEVEL",criteria:`"G3*"`,originCol:"R"},
                {colToSearch:"ENGLISH_LEVEL",criteria:`"G2*"`,originCol:"S"},
                {colToSearch:"ENGLISH_LEVEL",criteria:`"G1*"`,originCol:"T"},
                {colToSearch:"ENGLISH_LEVEL",criteria:`"G3(SBB)"`,originCol:"U"},
                {colToSearch:"ENGLISH_LEVEL",criteria:`"G2(SBB)"`,originCol:"V"},
                {colToSearch:"L2_LEVEL",criteria:`"G3*"`,originCol:"W"},
                {colToSearch:"L2_LEVEL",criteria:`"G2*"`,originCol:"X"},
                {colToSearch:"L2_LEVEL",criteria:`"G1*"`,originCol:"Y"},
                {colToSearch:"L2_LEVEL",criteria:`"G3(SBB)"`,originCol:"Z"},
                {colToSearch:"L2_LEVEL",criteria:`"G2(SBB)"`,originCol:"AA"},
                {colToSearch:"MATH_LEVEL",criteria:`"G3*"`,originCol:"AB"},
                {colToSearch:"MATH_LEVEL",criteria:`"G2*"`,originCol:"AC"},
                {colToSearch:"MATH_LEVEL",criteria:`"G1*"`,originCol:"AD"},
                {colToSearch:"MATH_LEVEL",criteria:`"G3(SBB)"`,originCol:"AE"},
                {colToSearch:"MATH_LEVEL",criteria:`"G2(SBB)"`,originCol:"AF"},
                {colToSearch:"SCIENCE_LEVEL",criteria:`"G3*"`,originCol:"AG"},
                {colToSearch:"SCIENCE_LEVEL",criteria:`"G2*"`,originCol:"AH"},
                {colToSearch:"SCIENCE_LEVEL",criteria:`"G1*"`,originCol:"AI"},
                {colToSearch:"SCIENCE_LEVEL",criteria:`"G3(SBB)"`,originCol:"AJ"},
                {colToSearch:"SCIENCE_LEVEL",criteria:`"G2(SBB)"`,originCol:"AK"}
                ]

                for(const countif of countifs)
                {
                    const excelColumn = headers.indexOf(countif["colToSearch"]);
                    const arrayRef = XLSX.utils.encode_cell({ c: excelColumn, r: 1})+":"+XLSX.utils.encode_cell({ c: excelColumn, r: this.#students.length});
                    const formula = `COUNTIF(INDIRECT(A${r}&"!${arrayRef}"),${countif["criteria"]})`;
                    //console.log(formula);
                    XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: formula}]], { origin: countif["originCol"]+r });
                }
                
                //average t score
                {
                    const excelColumn = headers.indexOf("AGG-T");
                    const arrayRef = XLSX.utils.encode_cell({ c: excelColumn, r: 1})+":"+XLSX.utils.encode_cell({ c: excelColumn, r: this.#students.length});
                    const formula = `AVERAGE(INDIRECT(A${r}&"!${arrayRef}"))`;
                    XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: formula}]], { origin: "Q"+r });
                }

                //formula to calculate race:OTHERS
                {
                    const formula = `B${r}-J${r}-K${r}-L${r}`;
                    XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: formula}]], { origin: "M"+r });
                }

                //formula to calculate Foreigners
                {
                    const formula = `B${r}-N${r}-O${r}`;
                    XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: formula}]], { origin: "P"+r });
                }
            }

            //summarise the blocks
            {
                let startRow = 1;
                for(let i=0;i<this.#blocks.length;i++)
                {
                    let block = this.#blocks[i];
                    XLSX.utils.sheet_add_aoa(ws, [[block.name]], { origin: "A"+(this.#classNames.length+3+i) });
                    for(let c=1;c<summaryHeader.length;c++)
                    {
                        const startCell = XLSX.utils.encode_cell({ c: c, r: startRow});
                        const endCell = XLSX.utils.encode_cell({ c: c, r: startRow+block.classNames.length-1});
                        const cell = XLSX.utils.encode_cell({ c: c, r: (this.#classNames.length+2+i)});
                        const formula = `sum(${startCell}:${endCell})`;
                        XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: formula}]], { origin: cell });
                        
                    }
                    
                    //average AGG-T
                    const aggColumn = summaryHeader.indexOf("AVG AL SCORE");
                    const totalColumn = summaryHeader.indexOf("Total");
                    let f1 = "(";
                    let f2 = "(";
                    for(let j=0;j<block.classNames.length;j++)
                    {
                        const cell1 = XLSX.utils.encode_cell({ c: aggColumn, r: startRow+j});
                        const cell2 = XLSX.utils.encode_cell({ c: totalColumn, r: startRow+j});
                        f1 += `${cell1}*${cell2}+`;
                        f2 += `${cell2}+`;
                    }
                    f1 = f1.substring(0,f1.length-1)+")";
                    f2 = f2.substring(0,f2.length-1)+")";
                    XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: f1+"/"+f2}]], { origin: XLSX.utils.encode_cell({ c: aggColumn, r: (this.#classNames.length+2+i)}) });
                    //console.log(f,XLSX.utils.encode_cell({ c: aggColumn, r: (this.#classNames.length+2+i)}))
                    startRow = startRow+block.classNames.length;
                }
            }
            XLSX.utils.book_append_sheet(wb, ws, "Summary");
        }

        //add the pivot table for primary schools
        {
            // Create an empty worksheet
            var ws = XLSX.utils.aoa_to_sheet([["temp"]]);

            XLSX.utils.book_append_sheet(wb, ws, "Primary Schools");
            const primarySchoolsColumn = headers.indexOf("PRI-SCH-NAME");
            const classAssignedColumn = headers.indexOf("CLASS_ASSIGNED");
            const arrayRef1 = "data!"+XLSX.utils.encode_cell({ c: primarySchoolsColumn, r: 1})+":"+XLSX.utils.encode_cell({ c: primarySchoolsColumn, r: this.#students.length});
            const arrayRef2 = "data!"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: 1 })+":"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: this.#students.length});
            let formula = `_xlfn._xlws.PIVOTBY(${arrayRef1},${arrayRef2},${arrayRef2},_xleta.COUNTA)`;
            XLSX.utils.sheet_set_array_formula(ws, "A1", formula, 1);

            for(let i=0;i<this.#primarySchools.length;i++)
            {
                const cellRef1 = XLSX.utils.encode_cell({ c: 1, r: i+1});
                const cellRef2 = XLSX.utils.encode_cell({ c: this.#classNames.length-1, r: i+1});//ignore unassigned
                const cellRef3 = XLSX.utils.encode_cell({ c: this.#classNames.length+2, r: i+1});
                const formula1 = `MAX(${cellRef1}:${cellRef2})`;
                XLSX.utils.sheet_set_array_formula(ws, cellRef3, formula1, 0);
            }
            const cellRef4 = XLSX.utils.encode_cell({ c: this.#classNames.length+2, r: 0});
            XLSX.utils.sheet_add_aoa(ws, [["MAX"]], {origin: cellRef4});
        }


        //remove the unassigned class
        this.#classNames.pop("unassigned");

        XLSX.writeFile(wb, outFilename);
        
    }

    /**
     * 
     * @param {Object} student the student to assign a class
     * @param {String} classAssigned the class to be assigned
     * @returns true if the student can be assigned to the class
     */
    #assignClass(student,classAssigned)
    {
        //find the block that contains the class
        for(const block of this.#blocks)
        {
            if (block["classNames"].indexOf(classAssigned)!=-1)
            {
                //found the block
                //check whether all constraints have at least one slot
                let canPlace = true;
                for(let constraint of block["constraints"])
                {
                    if ((constraint.inList!=undefined) && (constraint.inList.indexOf(student[constraint.column])!=-1)==constraint.flag)
                    {
                        if (constraint.number<1)
                        {
                            canPlace = false;
                        }
                    }
                    else if ((constraint.startsWith!=undefined) && (student[constraint.column].startsWith(constraint.startsWith))==constraint.flag)
                    {
                        if (constraint.number<1)
                        {
                            canPlace = false;
                        }
                    }
                }
                if (canPlace)
                {
                    student["CLASS_ASSIGNED"] = classAssigned;
                    //update the block
                    for(let constraint of block["constraints"])
                    {
                        if ((constraint.inList!=undefined) && (constraint.inList.indexOf(student[constraint.column])!=-1)==constraint.flag)
                        {
                            constraint["number"]--;
                        }
                        else if ((constraint.startsWith!=undefined) && (student[constraint.column].startsWith(constraint.startsWith))==constraint.flag)
                        {
                            constraint["number"]--;
                        }
                    }
                    //update the stats
                    const classIndex = this.#classNames.indexOf(classAssigned);
                    for(let stat of this.#stats)
                    {
                        if (stat.startsWith!=undefined && (student[stat.column].startsWith(stat.startsWith)==stat.flag))
                        {
                            stat.counts[classIndex]++;
                        }                        
                        else if (stat.inList!=undefined && (stat.inList.indexOf(student[stat.column])!=-1)==stat.flag )
                        {
                            stat.counts[classIndex]++;
                        }
                    }
                    
                    //update the class aggregates
                    const agg = student["AGG-T"];
                    if (Number.isFinite(agg))
                    {
                        this.#classAggregates[classIndex].push(agg);;
                    }
                }
                return canPlace;
            }
        }
        //reach here means cannot find block
        return false;
    }
    /**
     * 
     * @param {Object} student the student to unassign class
     */

    #unassignClass(student)
    {
        const classAssigned = student["CLASS_ASSIGNED"];
        student["CLASS_ASSIGNED"] = "unassigned";
        //find the block that contains the class
        for(const block of this.#blocks)
        {
            if (block["classNames"].indexOf(classAssigned)!=-1)
            {
                //found the block
                for(let constraint of block["constraints"])
                {
                    if ((constraint.inList!=undefined) && (constraint.inList.indexOf(student[constraint.column])!=-1)==constraint.flag)
                    {
                        constraint["number"]++;
                    }
                    else if ((constraint.startsWith!=undefined) && (student[constraint.column].startsWith(constraint.startsWith))==constraint.flag)
                    {
                        constraint["number"]++;
                    }
                }

                //update the stats
                const classIndex = this.#classNames.indexOf(classAssigned);
                for(let stat of this.#stats)
                {
                    if (stat.startsWith!=undefined && (student[stat.column].startsWith(stat.startsWith)==stat.flag))
                    {
                        stat.counts[classIndex]--;
                    }                        
                    else if (stat.inList!=undefined && (stat.inList.indexOf(student[stat.column])!=-1)==stat.flag )
                    {
                        stat.counts[classIndex]--;
                    }
                }
                //update the class aggregates
                const agg = student["AGG-T"];
                if (Number.isFinite(agg))
                {
                    const index = this.#classAggregates[classIndex].indexOf(agg);
                    //should not be -1
                    this.#classAggregates[classIndex].splice(index,1)
                }
            }
        }
    }

    /**
     * 
     * @param {Array} numbers the array of numbers to calculate variance
     * @returns the variance of the list of numbers
     */
    #calculateVariance(numbers)
    {
        let sumX = 0.0;
        let sumXSquared = 0.0;
        for(const no of numbers)
        {
            sumX = sumX + no;
            sumXSquared = sumXSquared + no*no;
        }
        return (sumXSquared/numbers.length-(sumX/numbers.length)*(sumX/numbers.length));
    }

    #calculateScore()
    {
        let score = 0.0;
        //variance of the criterias
        for(let stat of this.#stats)
        {            
            score += this.#calculateVariance(stat.counts)         
        }
        let classAverageAggregate = new Array();
        for(let list of this.#classAggregates)
        {
            let total = 0;
            for(const agg of list)
            {
                total += agg;
            }
            if (list.length>0)
            {
                classAverageAggregate.push(total/list.length);
            }
        }
        score += this.#calculateVariance(classAverageAggregate);
        return score;
    }
    /**
     * Attempt to allocate students that have not class
     * @returns the number of students not allocated a class
     */

    allocateStudents()
    {
        //search all student that were assigned a class in replace data
        let unassignedStudents = new Array();
        let studentsWithoutPossibleClass = new Array();
        let studentsAssigned = new Array();
        for(let student of this.#students)
        {
            if (student["CLASS_ASSIGNED"]==="unassigned")
            {
                unassignedStudents.push(student);
            }
            else
            {
                const result = this.#assignClass(student,student["CLASS_ASSIGNED"]);
                if (!result)
                {
                    console.error("Cannot assigned "+student["NRIC"]+" to "+student["CLASS_ASSIGNED"]);
                    studentsWithoutPossibleClass.push(student);
                }
                else
                {
                    console.log("Assigned "+student["NRIC"]+" to "+student["CLASS_ASSIGNED"]);
                }
            }
        }
        const totalUnassigned = unassignedStudents.length;
        let assigned = 0;
        while (unassignedStudents.length>0)
        {
            //console.log("Number of students left = "+unassignedStudents.length);
            //for each unassigned student, find the number of classes we can put the student, the best class with the best score
            //we will place the student with least number of possible classes to the best class with the best score
            let best = {
                numberOfPossibleClasses:this.#classNames.length+1,
                student:"",
                bestClass:"",
                bestScore:Number.MAX_VALUE
            };
            for (let student of unassignedStudents)
            {
                let noOfPossibleClasses = 0;
                let bestClass = "";
                let bestScore = Number.MAX_VALUE;
                for (let className of this.#classNames) {
                    let canPlace = this.#assignClass(student, className);
                    if (canPlace) {
                        noOfPossibleClasses++;
                        const score = this.#calculateScore();
                        if (score < bestScore) {
                            bestScore = score;
                            bestClass = className;
                        }
                        //reset
                        this.#unassignClass(student);
                    }
                }
                if (noOfPossibleClasses == 0)
                {
                    console.error(student["NRIC"], " has no possible class.");
                    studentsWithoutPossibleClass.push(student);
                    unassignedStudents.splice(unassignedStudents.indexOf(student), 1);////remove from unassigned list
                }
                else if (noOfPossibleClasses < best["numberOfPossibleClasses"])
                {
                    best["numberOfPossibleClasses"] = noOfPossibleClasses;
                    best["bestClass"] = bestClass;
                    best["bestScore"] = bestScore;
                    best["student"] = student;
                }
                else if ((noOfPossibleClasses == best["numberOfPossibleClasses"]) && (bestScore < best["bestScore"]))
                {
                    best["numberOfPossibleClasses"] = noOfPossibleClasses;
                    best["bestClass"] = bestClass;
                    best["bestScore"] = bestScore;
                    best["student"] = student;
                }
            }
            if (best["student"]!=undefined)
            {
                this.#assignClass(best["student"],best["bestClass"]);
                unassignedStudents.splice(unassignedStudents.indexOf(best["student"]), 1);////remove from unassigned list
                console.log("Placed",best["student"]["NRIC"],"at",best["bestClass"],best["bestScore"]);
                studentsAssigned.push(best["student"]);

                //dispatch event
                assigned++;
                const allocatedEvent = new CustomEvent("allocated", {detail: { message:"Initial allocation",assigned: assigned, total: totalUnassigned }});
                // Dispatch the event so listeners can react to it
                this.dispatchEvent(allocatedEvent);
            }
        }
        
        this.#optimise1(studentsAssigned);
        this.#optimise2(studentsAssigned);
        const completedEvent = new CustomEvent("allocated", {detail: { message:"completed",students:this.#students,unassigned: studentsWithoutPossibleClass.length}});
        this.dispatchEvent(completedEvent);
        return studentsWithoutPossibleClass.length;
    } 

    /**
     * see if a student has a better class to be allocated
     * @param {Array} students the list of students that we attempt to find a better class
     */
    #optimise1(students)
    {
        let changes = false;
        let loop = 0;
        do{
            loop++;
            console.log("Loop",loop);
            changes = false;
            for(let i=0;i<students.length;i++)
            {
                let student = students[i];
                const currentScore = this.#calculateScore();
                const currentClassAssigned = student["CLASS_ASSIGNED"]
                this.#unassignClass(student);
                let bestClass = undefined;
                let bestScore = Number.MAX_VALUE;
                for(const className of this.#classNames)
                {
                    if (className!=currentClassAssigned)
                    {
                        const canPlace = this.#assignClass(student,className);
                        if (canPlace)
                        {
                            const newScore = this.#calculateScore();
                            if (newScore<bestScore)
                            {
                                bestClass = className;
                                bestScore = newScore;
                            }
                            this.#unassignClass(student);
                        }
                    }
                    
                }
                if (bestScore<currentScore)
                {
                    console.log("Found a better class",bestClass,"for",student["NRIC"],"new score",bestScore,"<",currentScore);
                    this.#assignClass(student,bestClass);
                    changes = true;
                }
                else
                {
                    //assign back to old class
                    this.#assignClass(student,currentClassAssigned)
                }

                const allocatedEvent = new CustomEvent("allocated", {detail: { message:"Optimisation Level 1, loop "+loop,assigned: i+1, total: students.length }});
                // Dispatch the event so listeners can react to it
                this.dispatchEvent(allocatedEvent);
            }

        }while(changes)
    }

    /**
     * Attempt to swap 2 students to see if can get better score.
     * @param {Array} students the list of students that we attempt to swap to get better score
     */
    #optimise2(students)
    {
        let swapped = false;
        let loop = 0;
        do
        {
            loop++;
            swapped = false;
            for(let i=0;i<students.length-1;i++)
            {
                for(let j=i+1;j<students.length;j++)
                {
                    let s1 = students[i];
                    let s2 = students[j];
                    //check the score if swap the students
                    const s1CurrentClass = s1["CLASS_ASSIGNED"];
                    const s2CurrentClass = s2["CLASS_ASSIGNED"];
                    const currentScore = this.#calculateScore();
                    this.#unassignClass(s1);
                    this.#unassignClass(s2);
                    const canPlaceS1InNewClass = this.#assignClass(s1,s2CurrentClass);
                    const canPlaceS2InNewClass = this.#assignClass(s2,s1CurrentClass);
                    if (canPlaceS1InNewClass && canPlaceS2InNewClass)
                    {
                        const newScore = this.#calculateScore();
                        if (newScore<currentScore)
                        {
                            console.log("Swapped "+s1["NRIC"]+" and "+s1["NRIC"]+" new score "+newScore+"<"+currentScore);
                            swapped = true;
                        }
                        else
                        {
                            this.#unassignClass(s1);
                            this.#unassignClass(s2);
                            //assign them back to old class
                            this.#assignClass(s1,s1CurrentClass);
                            this.#assignClass(s2,s2CurrentClass);
                        }
                    }
                    else
                    {
                        this.#unassignClass(s1);
                        this.#unassignClass(s2);
                        //assign them back to old class
                        this.#assignClass(s1,s1CurrentClass);
                        this.#assignClass(s2,s2CurrentClass);
                    }
                }
                const allocatedEvent = new CustomEvent("allocated", {detail: { message:"Optimisation Level 2, loop "+loop,assigned: i+1, total: students.length }});
                // Dispatch the event so listeners can react to it
                this.dispatchEvent(allocatedEvent);
            }
        }while(swapped)
    }
}

