import stats from "./sorting.json" with { type: "json" };
import blocks from "./blocks.json" with { type: "json" };
import headers from "./headers.json" with { type: "json" };
import { saveAllocation } from './Utilities.js';

let postingFileBinary = null;
let additionalDataFileBinary = null;

const possibleColumnsValues = headers.toSorted();
const possibleCriterias =[
	"equals",
	"startsWith",
	"doesNotStartWith",
	"notInList",
	"inList"
].sort();
	
//global variables
let students = null;

/*function isNumeric(str)
{
	if (typeof str !== 'string') return false; // Ensure it's a string
	return str.trim() !== '' && !isNaN(Number(str));
}*/

function isDigitsOnly(str)
{
	return /^\d+$/.test(str);
}

function setPostingFileInputListener()
{
	const postingFileInput = document.getElementById('postingFileChooser');
	postingFileInput.addEventListener('change', async (event) =>
	{
		const file = event.target.files[0]; // Get the selected file
		if (!file)
		{
			return;
		}
		else
		{
			try
			{
				// Read the file as an ArrayBuffer (raw binary data)
				const arrayBuffer = await file.arrayBuffer();
				// Wrap it in a DataView or TypedArray to manipulate the bytes
				postingFileBinary = new Uint8Array(arrayBuffer);
				document.getElementById('generateButton').disabled = false;
			}
			catch (error)
			{
				console.error("Error reading ",file, error);
			}
		}
	});
}

function setAdditionalFataFileInputListener()
{
	const additionalFataFileInput = document.getElementById('additionalDataFileChooser');
	additionalFataFileInput.addEventListener('change', async (event) =>
	{
		const file = event.target.files[0]; // Get the selected file
		if (!file)
		{
			return;
		}
		else
		{
			try
			{
				// Read the file as an ArrayBuffer (raw binary data)
				const arrayBuffer = await file.arrayBuffer();
				// Wrap it in a DataView or TypedArray to manipulate the bytes
				additionalDataFileBinary = new Uint8Array(arrayBuffer);
			}
			catch (error)
			{
				console.error("Error reading ",file, error);
			}
		}
	});
}

function getBlocks()
{
	const blockDivs = document.getElementById('blocksDiv').querySelectorAll("div");
	let newBlocks = new Array();
	for(let blockDiv of blockDivs)
	{
		let newBlock = new Object();
		let inputs = blockDiv.querySelectorAll("input")
		let selects = blockDiv.querySelectorAll("select")
		//the first inpout is block name
		//the 2nd input is classNames
		newBlock.name = inputs[0].value;
		newBlock.classNames = inputs[1].value.split(",");
		newBlock.constraints = new Array();
		//console.log("Block")
		for(let i=0;i<selects.length/2;i=i+2)
		{
			//console.log("\t"+selects[i].value+","+selects[i+1].value+","+inputs[i+2].value+","+inputs[i+3].value);
			let constraint = new Object();
			constraint.column = selects[i].value;
			const check = selects[i+1].value;
			const values = inputs[i+2].value;
			if (check=="equals")
			{
				constraint[check] = isDigitsOnly(values) ? parseInt(values) : values;
			}
			else if ((check=="startsWith") || (check=="doesNotStartWith"))
			{
				constraint[check] = values;
			}
			else if ((check=="inList") || (check=="notInList"))
			{
				const tokens = values.split(",");
				constraint[check] = new Array();
				for(const t of tokens)
				{
					if (isDigitsOnly(t))
					{
						constraint[check].push(parseInt(t));
					}
					else
					{
						constraint[check].push(t);
					}
				}
			}
			constraint.number = inputs[i+3].value;
			 
			newBlock.constraints.push(constraint)
		}
		newBlocks.push(newBlock);
	}
	return newBlocks;
}

function getSortingCriteria()
{
	let newStats = new Array();
	const divElement = document.getElementById('sortingDiv');
	let rows = divElement.querySelectorAll('tr')
	for(let i=1;i<rows.length;i++)//1st row is header
	{
		let row = rows[i];
		let selectElements = row.querySelectorAll('select')		
		let textField = row.querySelector('input')
		let newStat = new Object();
		newStat["column"] = selectElements[0].value;
		if (selectElements[1].value=="equals")
		{
			newStat[selectElements[1].value] = isDigitsOnly(textField.value) ? parseInt(textField.value) : textField.value;
		}
		else if ((selectElements[1].value=="startsWith") || (selectElements[1].value=="doesNotStartWith"))
		{
			newStat[selectElements[1].value] = textField.value;
		}
		else if ((selectElements[1].value=="inList") ||  (selectElements[1].value=="notInList"))
		{
			const tokens = textField.value.split(",");
			newStat[selectElements[1].value] = new Array();
			for(const t of tokens)
			{
				if (isDigitsOnly(t))
				{
					newStat[selectElements[1].value].push(parseInt(t));
				}
				else
				{
					newStat[selectElements[1].value].push(t);
				}
			}
		}
		newStats.push(newStat);
	}
	return newStats;
}

function setGenerateButtonListener()
{
	const generateButton = document.getElementById('generateButton');
	
	generateButton.addEventListener('click', async (event) =>
	{
		console.log("Generate")
		generateButton.disabled = true;
		const newStats = getSortingCriteria();
		const newBlocks = getBlocks();
		const w = new Worker(new URL('./Worker.js', import.meta.url), { type: 'module' });
		w.postMessage({
			postingFileBinary : postingFileBinary,
			additionalDataFileBinary : additionalDataFileBinary,
			stats : newStats,
			blocks: newBlocks
		});
		w.onmessage = function(event)
		{
			const message = event.data.message;
			//console.log(event.data.message);
			if (message=="completed")
			{
				alert(event.data.unassigned+" student(s) unassigned.")
				generateButton.disabled = false;
				const progressDiv = document.getElementById("progressDiv")
				progressDiv.style.display = "none";
				let outputDiv = document.getElementById("output");
				outputDiv.replaceChildren();
				let html = `<table id="outTable">`
				//header
				{
					html += "<thead><tr>";
					for(const h of headers)
					{
						html += `<th>${h}</th>`
					}
					html += "</tr></thead>";
				}
				html += "<tbody>";
				for(let i=0;i<event.data.students.length;i++)
				{
					let s = event.data.students[i];
					html += "<tr>";
					for(const h of headers)
					{
						const value = s[h]==undefined?"":s[h];
						html += `<td>${value}</td>`
					}
					html += "</tr>";
				}
				html += "</tbody>";
				html += "</table>";
				outputDiv.innerHTML = html;
				new DataTable("#outTable");
				const saveDiv = document.getElementById("saveDiv")
				saveDiv.style.display = "block";
				students = event.data.students;
			}
			else
			{
				//console.log("Data received from worker:", event.data);
				const progressDiv = document.getElementById("progressDiv")
				progressDiv.style.display = "block";
				const messageDiv = document.getElementById("messageDiv");
				messageDiv.innerHTML = message;
				const progressElement = document.getElementById("progressBar");
				progressElement.value = event.data.assigned;
				progressElement.max = event.data.total;
			}
		};
	});
}

function createSortingDiv()
{
	const divElement = document.getElementById('sortingDiv');
	divElement.replaceChildren();//remove all elements
	let tableElement = document.createElement("table");
	
	{
		{
			let headerRowElement = document.createElement("tr");
			const header = ["Column","Criteria","Value(s)",""];
			for(const h of header)
			{
				let headerElement = document.createElement("th");
				headerElement.textContent = h;
				headerRowElement.appendChild(headerElement);
			}
			tableElement.appendChild(headerRowElement);
		}
		
		for(let i=0;i<stats.length;i++)
		{
			let stat = stats[i];
			let rowElement = document.createElement("tr");
			let col1Element = document.createElement("td");
			let columnNameSelect = document.createElement("select");
			for(const columnValue of possibleColumnsValues)
			{
				let option = document.createElement("option");
				option.value = columnValue;
				option.textContent = columnValue;
				columnNameSelect.appendChild(option);
			}
			col1Element.appendChild(columnNameSelect);
			
			rowElement.appendChild(col1Element);
			
			let col2Element = document.createElement("td");
			let criteriaSelect = document.createElement("select");
			for(const criteriaValue of possibleCriterias)
			{
				let option = document.createElement("option");
				option.value = criteriaValue;
				option.textContent = criteriaValue;
				criteriaSelect.appendChild(option);
			}
			col2Element.appendChild(criteriaSelect);
			rowElement.appendChild(col2Element);
			
			let col3Element = document.createElement("td");
			let textField = document.createElement("input");
			textField.type = "text";
			col3Element.appendChild(textField);
			rowElement.appendChild(col3Element);
			

			let col4Element = document.createElement("td");
			let removeButton = document.createElement("button");
			removeButton.textContent = "remove";
			removeButton.addEventListener("click", () => {
  				removeSortingCriteria(i);
			});
			col4Element.appendChild(removeButton);
			rowElement.appendChild(col4Element);
			tableElement.appendChild(rowElement);

			//set the value
			columnNameSelect.value = stat.column;			
			if (stat.equals!=undefined)
			{
				criteriaSelect.value = "equals";
				textField.value = stat.equals;
			}
			else if (stat.startsWith!=undefined)
			{
				criteriaSelect.value = "startsWith";
				textField.value = stat.startsWith;
			}
			else if (stat.doesNotStartWith!=undefined)
			{
				criteriaSelect.value = "doesNotStartWith";
				textField.value = stat.doesNotStartWith;
			}
			else if (stat.notInList!=undefined)
			{
				criteriaSelect.value = "notInList";
				textField.value = ""+stat.notInList;
			}
			else if (stat.inList!=undefined)
			{
				criteriaSelect.value = "inList";
				textField.value = ""+stat.inList;
			}
		}
	}	
	divElement.appendChild(tableElement);
}

/**
 * remove sortibg criteria at index
 * @param {integer} index the index of the constraints in array to be removed 
 */
function removeSortingCriteria(index)
{
	stats.splice(index,1);
	createSortingDiv();
}

/**
 * add a new sorting criteria
 */
function addSortingCriteria()
{
	let stat = new Object();
	stat.column = "AGG-T";
	stat.equals = 0;
	stats.push(stat);
	createSortingDiv();
}

/**
 * remove constraint j of block i
 * @param {integer} i  
 * @param {integer} j 
 */
function removeBlockConstraint(i,j)
{
	blocks[i].constraints.splice(j,1);
	createBlocksDiv();
}

/**
 * Add a new constraint to block i
 * @param {*} i 
 */
function addBlockConstraint(i)
{
	blocks[i].constraints.push({column:"AGG-T",equals:0,number:0});
	createBlocksDiv();
}

/**
 * remove block i
 * @param {*} i 
 */
function removeBlock(i)
{
	blocks.splice(i,1)
	createBlocksDiv();
}

/**
 * add a new block
 */
function addBlock()
{
	let block = new Object();
	block.name = "New Block";
	block.classNames = new Array();
	block.constraints = new Array();
	blocks.push(block);
	createBlocksDiv();
}

function createBlocksDiv()
{
	const divElement = document.getElementById('blocksDiv');
	divElement.replaceChildren();//remove all elements
	//divElement.style = "padding: 10px;"
	for(let i=0;i<blocks.length;i++)
	{
		let block = blocks[i];
		let blockDiv = document.createElement("div");
		//blockDiv.style = "padding: 10px;"
		divElement.appendChild(blockDiv);
		{
			let p = document.createElement("p")
			p.style = "font-size: larger;font-weight:bold;"
			p.textContent = `Block ${i+1} `; 
			blockDiv.appendChild(p);

			let removeBlockButton = document.createElement("button");
			removeBlockButton.textContent = "Remove";
			removeBlockButton.addEventListener("click", () => {
				removeBlock(i);
			});
			p.appendChild(removeBlockButton);
		}
		{
			let table = document.createElement("table");
			{
				let row = document.createElement("tr");
				table.append(row);

				let cell1 = document.createElement("td");
				cell1.insertAdjacentHTML('beforeend', `<strong>Name:</strong>`);
				row.appendChild(cell1);

				let cell2 = document.createElement("td");
				let input = document.createElement("input");
				input.value = ""+block.name;
				cell2.appendChild(input)
				row.appendChild(cell2);
			}
			{
				let row = document.createElement("tr");
				table.append(row);

				let cell1 = document.createElement("td");
				cell1.insertAdjacentHTML('beforeend', `<strong>Classes:</strong>`);
				row.appendChild(cell1);

				let cell2 = document.createElement("td");
				let input = document.createElement("input");
				input.value = ""+block.classNames;
				cell2.appendChild(input);
				row.appendChild(cell2);
			}

			blockDiv.appendChild(table)
		}

		{
			let p = document.createElement("p")
			p.style = "font-size: large;font-weight:bold;"
			p.textContent = `Constriants `; 
			blockDiv.appendChild(p);

			let addConstraintButton = document.createElement("button");
			addConstraintButton.textContent = "Add";
			addConstraintButton.addEventListener("click", () => {
				addBlockConstraint(i);
			});
			p.appendChild(addConstraintButton);
		}

		{
			let table = document.createElement("table");

			{
				let headerRowElement = document.createElement("tr");
				const header = ["Column","Criteria","Value(s)","Maximum",""];
				for(const h of header)
				{
					let headerElement = document.createElement("th");
					headerElement.textContent = h;
					headerRowElement.appendChild(headerElement);
				}
				table.appendChild(headerRowElement);
				for(let j=0;j<block.constraints.length;j++)
				{
					let constraint = block.constraints[j];
					let rowElement = document.createElement("tr");
					let col1Element = document.createElement("td");
					let columnNameSelect = document.createElement("select");
					for(const columnValue of possibleColumnsValues)
					{
						let option = document.createElement("option");
						option.value = columnValue;
						option.textContent = columnValue;
						columnNameSelect.appendChild(option);
					}
					col1Element.appendChild(columnNameSelect);
			
					rowElement.appendChild(col1Element);
			
					let col2Element = document.createElement("td");
					let criteriaSelect = document.createElement("select");
					for(const criteriaValue of possibleCriterias)
					{
						let option = document.createElement("option");
						option.value = criteriaValue;
						option.textContent = criteriaValue;
						criteriaSelect.appendChild(option);
					}
					col2Element.appendChild(criteriaSelect);
					rowElement.appendChild(col2Element);
					
					let col3Element = document.createElement("td");
					let textField = document.createElement("input");
					textField.type = "text";
					col3Element.appendChild(textField);
					rowElement.appendChild(col3Element);
					
					let col4Element = document.createElement("td");
					let maxInputField = document.createElement("input");
					maxInputField.type = "number"; 
					maxInputField.min = 0;
					
					col4Element.appendChild(maxInputField);
					rowElement.appendChild(col4Element);

					let col5Element = document.createElement("td");
					let removeButton = document.createElement("button");
					removeButton.textContent = "remove";
					removeButton.addEventListener("click", () => {
						removeBlockConstraint(i,j);
					});
					col5Element.appendChild(removeButton);
					rowElement.appendChild(col5Element);
					table.appendChild(rowElement);

					//set the value
					columnNameSelect.value = constraint.column;			
					if (constraint.equals!=undefined)
					{
						criteriaSelect.value = "equals";
						textField.value = constraint.equals;
					}
					else if (constraint.startsWith!=undefined)
					{
						criteriaSelect.value = "startsWith";
						textField.value = constraint.startsWith;
					}
					else if (constraint.doesNotStartWith!=undefined)
					{
						criteriaSelect.value = "doesNotStartWith";
						textField.value = constraint.doesNotStartWith;
					}
					else if (constraint.notInList!=undefined)
					{
						criteriaSelect.value = "notInList";
						textField.value = ""+constraint.notInList;
					}
					else if (constraint.inList!=undefined)
					{
						criteriaSelect.value = "inList";
						textField.value = ""+constraint.inList;
					}
					maxInputField.value = constraint.number;
				}
			}

			blockDiv.appendChild(table)
		}
	}
}

function save()
{
	saveAllocation("output.xlsx",students,getBlocks());
}

export function afterDOMLoaded()
{
	setPostingFileInputListener();				
	setAdditionalFataFileInputListener();
	setGenerateButtonListener();
	createSortingDiv();
	document.getElementById("addCriteriaButton").addEventListener("click", () => {addSortingCriteria();});
	createBlocksDiv();
	document.getElementById("addBlockButton").addEventListener("click", () => {addBlock();});
	document.getElementById("saveButton").addEventListener("click", () => {save();});
}