# Introduction
This github repository contains the code that I had created to help in auto assigning new secondary students to their new classes.

You can access the webpage at https://tanhongcheong.github.io/Sec1Allocation/.

# You need two files to be downloaded from School Cockpit.

1. The posting file.
![Download Posting File.bmp](https://github.com/user-attachments/files/34722989/Download.Posting.File.bmp)

2. Summary Report for Subjects at MDL (Final) (Report ID RE_PPS_011)
![Download Summary Report for Subjects at MDL (Final).bmp](https://github.com/user-attachments/files/34723071/Download.Summary.Report.for.Subjects.at.MDL.Final.bmp)

The code will append additional columns to posting file.
1. ENGLISH_LEVEL: the English level the student is taking at G1, G2, G3, G2(SBB), G3(SBB). (SBB) indicates that the student is taking at a more demanding level.
2. L2_LEVEL: the Mother Tongue level the student is taking at G1, G2, G3, G2(SBB), G3(SBB). (SBB) indicates that the student is taking at a more demanding level.
3. MATH_LEVEL: the Mathematics level the student is taking at G1, G2, G3, G2(SBB), G3(SBB). (SBB) indicates that the student is taking at a more demanding level.
4. SCIENCE_LEVEL: the Science level the student is taking at G1, G2, G3, G2(SBB), G3(SBB). (SBB) indicates that the student is taking at a more demanding level.
5. TOTAL_NO_EMS_SBB: The total number of English, Mathematics, Science taking at a more demanding level.
6. CLASS_ASSIGNED: The class assigned by the algorithm.
7. COMMENT: General comments input by you. (See below)

# Additional data
You can replace student's data. A sample template of the excel file can be downloaded: [Additional Data Template File](<./Additional Data Template File.xlsx>).

The file has four fields:
1. The NRIC of the student.
2. The name of the student.
3. The column where the data is to be replaced (the column in the posting file).
4. The new value to replace the old value.

For example, if you want to add the CCA the DSA student is under, you can add:\
Student's NRIC,Student's Name,DSA_IND,Y (Basketball)

You can also add comment to student. For example:\
Student's NRIC,Student's Name,COMMENT,Twins 1

In my school, some students are assigned a particular class. This can be achieved by:
Student's NRIC,Student's Name,CLASS_ASSIGNED,Class1\
will assign the students to Class1, the algorithm will not reassign the student to other class.

# Using the webpage

## Step 1: Inputting the necessary data.
![Step 1.bmp](https://github.com/user-attachments/files/34723455/Step.1.bmp)

The posting and MDL files are necessary.

## Step 2: The sorting criteria.
![Step 2.bmp](https://github.com/user-attachments/files/34723555/Step.2.bmp)

The default criteria are:
1. POST-CAT,equals,PG1
This means that the algorithm will attempt to evenly distribute PG1 students to the classes.
2. POST-CAT,equals,PG2
This means that the algorithm will attempt to evenly distribute PG2 students to the classes.
3. POST-CAT,equals,PG3
This means that the algorithm will attempt to evenly distribute PG3 students to the classes.
4. POST-CAT,inList,PG1,PG2,PG3
Since every student is either PG1,PG2 or PG3, this means that the algorithm will attempt to evenly distribute all students to the classes.
5. SEX,equals,F
This means that the algorithm will attempt to evenly distribute female students to the classes.
6. PRIMARY_RACE,equals,MY
This means that the algorithm will attempt to evenly distribute Malay students to the classes.
7. PRIMARY_RACE,equals,IN
This means that the algorithm will attempt to evenly distribute Indian students to the classes.
8. PRIMARY_RACE,notInList,CN,MY,IN
This means that the algorithm will attempt to evenly distribute non Chinese,Malay,Indian students to the classes.
9. DSA_IND,startsWith,Y
This means the algorithm will attempt to evenly distribute DSA students to the classes.
In my school, I will append the CCA after Y to denote the student's CCA.\
If you did not change the DSA_IND value, DSA_IND,equals,Y will work.
10. CITIZEN_DESC,doesNotStartsWith,SINGAPORE
This means the algorithm will attempt to evenly distribute foreign students to the classes.

The algorithm will attempt the distribute the students based on their primary school. This cannot be disabled.

## Step 3: Blocks setup
The default configuration has two blocks of 4 classes each.\
<img width="1023" height="709" alt="image" src="https://github.com/user-attachments/assets/6e5ba21b-9238-415b-b7b6-aad2185bb408" />\
The "classes" field is a comma separated value of the classes' names.\
The constraints set a limit for each block. For example:
1. POST-CAT,inList,PG1,PG2,PG3 limits the total number of students in the block.
2. POST-CAT,equals,PG1 limits the total number of PG1 students in the block.
3. POST-CAT,equals,PG2 limits the total number of PG2 students in the block.
4. POST-CAT,equals,PG3 limits the total number of PG3 students in the block.
5. ENGLISH__LEVEL,starstWith,PG1 limits the number of student taking G1 EL.
6. ENGLISH__LEVEL,starstWith,PG2 limits the number of student taking G2 EL (including students taking it a more demanding level).
7. ENGLISH__LEVEL,starstWith,PG2 limits the number of student taking G3 EL (including students taking it a more demanding level).
8. MATH__LEVEL,starstWith,PG1 limits the number of student taking G1 Math.
9. MATH__LEVEL,starstWith,PG2 limits the number of student taking G2 Math (including students taking it a more demanding level).
10. MATH__LEVEL,starstWith,PG3 limits the number of student taking G3 Math (including students taking it a more demanding level).
11. SCIENCE__LEVEL,starstWith,PG1 limits the number of student taking G1 Science.
12. SCIENCE__LEVEL,starstWith,PG2 limits the number of student taking G2 Science (including students taking it a more demanding level).
13. SCIENCE__LEVEL,starstWith,PG3 limits the number of student taking G3 Science (including students taking it a more demanding level).

## Step 4: Click the generate button to auto assign the students.
<img width="371" height="155" alt="image" src="https://github.com/user-attachments/assets/3634c4c3-24aa-42fe-8ed5-34821b71c857" />\
The webpage will indicate how many students was not assigned a class. Ideally, it should be 0. If it is not, you may want to change the blocks configuration.

## Step 5: Scroll to end of page and click save to save the allocation.


