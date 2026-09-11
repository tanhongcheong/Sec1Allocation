import headers from "./headers.json" with { type: "json" };
import * as XLSX from './xlsx.mjs';


/**
 * @returns the list of primary schools
 * @param {Array} students the list of students
 */
export function getPrimarySchools(students)
{
    let schools = new Array();
    for(const student of students)
    {
        const school = student["PRI-SCH-NAME"];
        if (schools.indexOf(school)==-1)
        {   
            if (school!=undefined)
            {
                schools.push(school);
            }
        }
    }
    return schools.sort();
}

export function saveAllocation(outFilename,students,blocks)
{
    const wb = XLSX.utils.book_new();
    //the data sheet
    {
        const ws = XLSX.utils.json_to_sheet(students,{header: headers});
        XLSX.utils.book_append_sheet(wb, ws, "data");
    }

    //get all the class names
    let classNames = new Array();
    for(const block of blocks)
    {
        classNames.push(...block["classNames"])
    }

    //temporary add on the unassigned class
    classNames.push("unassigned");

    //get all the primary schools
    let primarySchools = getPrimarySchools(students);

    //add in the classes sheets
    for(const className of classNames)
    {
        let ws = XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.book_append_sheet(wb, ws, className);
        const classAssignedColumn = headers.indexOf("CLASS_ASSIGNED");
        const commentColumn = headers.indexOf("COMMENT");
        const arrayRef = "data!A2:"+XLSX.utils.encode_cell({ c: commentColumn, r: students.length});
        const lookupRef = "data!"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: 1 })+":"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: students.length});
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

        for(let i=0;i<classNames.length;i++)
        {
            const r = i+2;      
            XLSX.utils.sheet_add_aoa(ws, [[classNames[i]]], { origin: 'A'+r });

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
                const arrayRef = XLSX.utils.encode_cell({ c: excelColumn, r: 1})+":"+XLSX.utils.encode_cell({ c: excelColumn, r: students.length});
                const formula = `COUNTIF(INDIRECT(A${r}&"!${arrayRef}"),${countif["criteria"]})`;
                //console.log(formula);
                XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: formula}]], { origin: countif["originCol"]+r });
            }
            
            //average t score
            {
                const excelColumn = headers.indexOf("AGG-T");
                const arrayRef = XLSX.utils.encode_cell({ c: excelColumn, r: 1})+":"+XLSX.utils.encode_cell({ c: excelColumn, r: students.length});
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
            for(let i=0;i<blocks.length;i++)
            {
                let block = blocks[i];
                XLSX.utils.sheet_add_aoa(ws, [[block.name]], { origin: "A"+(classNames.length+3+i) });
                for(let c=1;c<summaryHeader.length;c++)
                {
                    const startCell = XLSX.utils.encode_cell({ c: c, r: startRow});
                    const endCell = XLSX.utils.encode_cell({ c: c, r: startRow+block.classNames.length-1});
                    const cell = XLSX.utils.encode_cell({ c: c, r: (classNames.length+2+i)});
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
                XLSX.utils.sheet_add_aoa(ws, [[{t: "n", f: f1+"/"+f2}]], { origin: XLSX.utils.encode_cell({ c: aggColumn, r: (classNames.length+2+i)}) });
                //console.log(f,XLSX.utils.encode_cell({ c: aggColumn, r: (classNames.length+2+i)}))
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
        const arrayRef1 = "data!"+XLSX.utils.encode_cell({ c: primarySchoolsColumn, r: 1})+":"+XLSX.utils.encode_cell({ c: primarySchoolsColumn, r: students.length});
        const arrayRef2 = "data!"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: 1 })+":"+XLSX.utils.encode_cell({ c: classAssignedColumn, r: students.length});
        let formula = `_xlfn._xlws.PIVOTBY(${arrayRef1},${arrayRef2},${arrayRef2},_xleta.COUNTA)`;
        XLSX.utils.sheet_set_array_formula(ws, "A1", formula, 1);

        for(let i=0;i<primarySchools.length;i++)
        {
            const cellRef1 = XLSX.utils.encode_cell({ c: 1, r: i+1});
            const cellRef2 = XLSX.utils.encode_cell({ c: classNames.length-1, r: i+1});//ignore unassigned
            const cellRef3 = XLSX.utils.encode_cell({ c: classNames.length+2, r: i+1});
            const formula1 = `MAX(${cellRef1}:${cellRef2})`;
            XLSX.utils.sheet_set_array_formula(ws, cellRef3, formula1, 0);
        }
        const cellRef4 = XLSX.utils.encode_cell({ c: classNames.length+2, r: 0});
        XLSX.utils.sheet_add_aoa(ws, [["MAX"]], {origin: cellRef4});
    }


    //remove the unassigned class
    classNames.pop("unassigned");

    XLSX.writeFile(wb, outFilename);
    
}