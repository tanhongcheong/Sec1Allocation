# Introduction
This github repository contains the code that I had created to help in auto assigning new secondary students to their new classes.

You can access the webpage at https://tanhongcheong.github.io/Sec1Allocation/.

# You need two files to be downloaded from School Cockpit.

1. The posting file.
![Download Posting File.bmp](https://github.com/user-attachments/files/34722989/Download.Posting.File.bmp)

2. Summary Report for Subjects at MDL (Final) (Report ID RE_PPS_011)
![Download Summary Report for Subjects at MDL (Final).bmp](https://github.com/user-attachments/files/34723071/Download.Summary.Report.for.Subjects.at.MDL.Final.bmp)

# Additional data
You can replace student's data. A sample template of the excel file can be downloaded: [Additional Data Template File](<./Additional Data Template File.xlsx>).

The file has four fields:
1. The NRIC of the student.
2. The name of the student.
3. The column where the data is to be replaced (the column in the posting file).
4. The new value to replace the old value.

For example, if you want to add the CCA the DSA student is under, you can add:\
Student's NRIC,Student's Name,DSA_IND,Y (Basketball)

The code also accept column named "COMMENT" where you can add comment to student. For example:\
Student's NRIC,Student's Name,COMMENT,Twins 1

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

## Step 3: Blocks setup
<img width="1023" height="709" alt="image" src="https://github.com/user-attachments/assets/6e5ba21b-9238-415b-b7b6-aad2185bb408" />

