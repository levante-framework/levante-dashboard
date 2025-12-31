# LEVANTE Dashboard - Complete Documentation

## Overview

The LEVANTE Dashboard is the "home base" for researchers to manage study participants, assign specific measures to them, and monitor assignment completion. Study participants (children, caregivers, and teachers) are all dashboard users that complete measures by logging in with unique login credentials.

**Note:** Participant data is **not** accessed through the dashboard (see [Data Access](https://www.notion.so/Data-Access-decd0951be29445d85e80ed1ace51760?pvs=21)).

**Links:**
- LEVANTE Researcher Site: https://researcher.levante-network.org/
- LEVANTE Dashboard app: https://platform.levante-network.org/

---

## Dashboard Quick Start

To set up your study, add groups, users, and assignments by following Steps 1–3 below. It is recommended to complete setup and ensure that tasks are running as expected at least **one week (5 business days)** before your first participants begin the study. If issues arise during setup, see [Support](https://researcher.levante-network.org/support).

### Setup Steps:
1. [Before you start](#before-you-start)
2. [Add groups](#1-add-groups)
3. [Add and link users](#2-add-and-link-users)
4. [Create assignments](#3-create-assignments)

---

## Before You Start

❗ If you haven't read the [Overview](https://researcher.levante-network.org/overview) yet, start there instead!

### Technical Requirements

The LEVANTE direct assessment measures can be administered on any tablet or computer with a web browser and internet connection. In the case of uncertainty, task demos on the [Direct Child Measures](https://researcher.levante-network.org/measures/direct-child-measures) page can be used for testing device compatibility.

- We explicitly support the last two major releases of the web browsers **Chrome, Safari, and Edge**.
- We have tested with both **Android and Apple tablets**.
- We **do not recommend** administration on smartphones due to their small screen size. Although measures are viewable on many phones, we do not support phones at this time and behavior may be unpredictable.
- At present, these measures require an **active internet connection**. Some sites have had success using StarLink for administration in regions with limited connectivity.

If you have specific technical questions, please see the [Support](https://researcher.levante-network.org/support) page.

### Dashboard Structure

To successfully run a study using LEVANTE, your research team needs to become familiar with the key terms (in **bold**) and concepts described below.

#### Users

**Users** are participants who log into the dashboard to complete tasks and surveys. There are three user types: **child**, **caregiver**, and **teacher**. Caregivers and teachers are linked to child users to connect their survey responses to the relevant child(ren).

Users have two identifiers that are loaded into the LEVANTE platform: 
1. The lab- or site-specific **project id** 
2. The **levante user id (uid)**

The project id that you create for internal usage in your lab should be associated with personal, identifiable information, such as names, exact birth dates, and contact information. The levante uid is the identifier we (at the Data Coordinating Center) create and use to publicly share data in the data repository (we neither save nor share the project id).

❗ **LEVANTE will not store personal, identifiable information.** This means that your research team needs a plan to separately keep track of users' personal, identifiable information in accordance with your institutional and country guidelines for human research. You must track project ids, levante uids, and personal identifiers outside of the LEVANTE platform so that you can ensure that each user gets the same levante uid at longitudinal follow up.

#### Groups

Each user belongs to one or more groups. There are four types of **groups**: sites, schools, classes, and cohorts. Groups are hierarchically nested.

The highest-level group is called a **site.** Usually, researchers collecting data with LEVANTE for a particular project constitute a site. When data is shared in the data repository, it is grouped under the same site name. We at the Data Coordinating Center create the site name on the platform prior to beginning your project. When your data are shared openly, this site name is the identifier that will be used— that's why it has a very specific format.

While you must have an assigned site name, you can create other types of groups more flexibly depending on study design (Figure 1). For school-based studies, sites contain **schools**, and schools contain **classes**. For other study designs (e.g., community or family-based studies), sites contain one or more **cohorts**.

**Figure 1.** Standard group hierarchies for school and cohort-based designs
*(See original page for diagram)*

#### Assignments

An **assignment** is a bundle of tasks (e.g., Vocabulary, Hearts & Flowers, Math, etc.) and surveys that users complete. The same task can have different **variants** — for example, the same vocabulary task is available in different languages.

#### Giving Assignments to Groups

Assignments "flow" to users (dotted arrowed lines) via their group and based on user type. In other words, child learning tasks and survey measures flow to child users, teacher surveys to teachers, and caregiver surveys to caregivers.

Currently, so long as surveys are included in the assignment bundle, all surveys will be assigned – caregiver and teacher surveys do not need to be given separately. (Please note: We are working on an update allowing you to separately give or withold the child survey.)

**Figure 2.** Assignments flow to users via their group and based on user type
*(See original page for diagram)*

Since groups are hierarchically nested, tasks and surveys assigned to a higher-level group will automatically reach all groups below. For example, tasks and surveys assigned to a site will reach all users, regardless of their school, class, or cohort.

Generally, we recommend giving assignments to the **lowest-level group** (See Figures 3 and 4). For example, even when there is only one cohort, we recommend assigning tasks and surveys to cohorts rather than site. This allows for the possibility that new cohorts could be added to the same site in the future.

When following the same cohort over time, longitudinal designs are handled by creating new assignments for each time point — not new groups or users (Figure 3).

**Figure 3.** Standard cohort-based two-time point longitudinal project called "How Kids Learn"
*(See original page for diagram)*

**Figure 4.** Standard cross-sectional school-based project called the "Learning in School Study"
*(See original page for diagram)*

### Glossary

| **Term** | **Description** | **Examples** |
|----------|----------------|--------------|
| **Administrator** | A site-level dashboard user who can create groups, add users, and make assignments. | A principal investigator (PI) or research assistant |
| **Assignment** | A collection of tasks and surveys. | Vocabulary, sentence understanding, math, and memory tasks are bundled alongside surveys into a single assignment for completion. |
| **DCC** | The Data Coordinating Center ("DCC") is based at Stanford University. We administer, create, implement, and maintain the LEVANTE platform and data repository. | NA |
| **Group** | Hierarchically structured entities to which users are added and assignments are given. | There are four types of groups: sites, schools, classes, and cohorts |
| **Site** | A specific scientific project or group of researchers using the LEVANTE Framework. Site are named according to a specified format; names are assigned by the DCC. | Pilot project at Universidad de los Andes in Bogotá, Colombia (pilot-uniandes-co-bogota), partnership with the Stanford Project on Adaptation and Resilience in Kids (partner-sparklab-us-downex) |
| **Task** | A specific assessment completed by users, including activities and surveys. | Math, Vocabulary, Stories, Survey, etc. |
| **User** | A participant user of the dashboard who logs in to do tasks. | There are three user types: child, caregiver, and teacher. |
| **Variant** | A version of a task with unique parameters, items, or in a specific language | Computer-adaptive version of the Vocabulary task in Spanish |

---

## 1. Add Groups

❗ Read [Before you start](#before-you-start) before continuing with your setup.

### Decide on a Group Structure

"Site" is the highest-level group, and its name is assigned to research teams by the Data Coordinating Center. Please email [levante-support@stanford.edu](mailto:levante-support@stanford.edu) to obtain a Site name; typically both an official site for collecting data and a "sandbox" for exploring the dashboard will be added for you.

After a site has been added for you, there are two group structures to choose from based on whether your study is school-based or cohort-based. See the Groups section of the [Before you start](#before-you-start) page for more information.

**Figure 1.** Standard group hierarchies for school and cohort-based designs
*(See original page for diagram)*

### How to Add Groups

**1.** Click "Groups" from the top navigation bar.

**2.** Click "Add Group."

**3.** Select the type of group to be created (school, class, or cohort).

⚠️ **Alert!** In school-based studies, schools must be created before classes

**4.** Select which site the group belongs to. When creating classes, you also need to specify which school the class belongs to.

**5.** Name your group (in this case, a school called "LEVANTE Elementary"). See "Guidance on naming groups" for more information.

**6.** Click "Add."

**7.** Click "Add Group" again to repeat this process as needed, until your group structure is complete.

---

## 2. Add and Link Users

❗ Read [Before you start](#before-you-start) before attempting to add or link users.

❗ You cannot add users without first [adding their group(s)](#1-add-groups).

**Users** are participants who log into the dashboard to complete tasks and surveys. There are three user types: **child**, **caregiver**, and **teacher**. Caregivers and teachers are linked to child users to connect their survey responses to the relevant child(ren).

Users have two identifiers that are loaded into the LEVANTE platform: 
1. The lab- or site-specific **project id** 
2. The **levante user id (uid)**

The project id that you create for internal usage in your lab should be associated with personal, identifiable information, such as names, exact birth dates, and contact information. The levante uid is the identifier we (at the Data Coordinating Center) create and use to publicly share data in the data repository (we neither save nor share the project id).

❗ **LEVANTE will not store personal, identifiable information.** This means that your research team needs a plan to separately keep track of users' personal, identifiable information in accordance with your institutional and country guidelines for human research. You must track project ids, levante uids, and personal identifiers outside of the LEVANTE platform so that you can ensure that each user gets the same levante uid at longitudinal follow up.

Users can be added all at once or users can be added on a rolling basis; not all users need to be added at the same time. Users must be added to the dashboard before they can be linked to one another.

### User Information CSV Files

Follow Step 2A below to download a template user info file.

#### Researcher Input Fields

Complete the fields in your user info file as described in Table 1.

**Table 1.** Researcher-inputted user information fields

| **Field** | **Required?** | **Definition** | **Details** |
|-----------|---------------|----------------|-------------|
| `id` | Yes | Project id; A lab- or site-specific user identifier | Often a study acronym and a number. Example: hkl_012 |
| `userType` | Yes | Type of dashboard user | Either "child", "caregiver", or "teacher" |
| `month` | Yes, for child users only | Month the child user was born | A number from 1 to 12. Example: 5 for May |
| `year` | Yes, for child users only | Year the child user was born | Four-digit year. Example: 2017 |
| `caregiverId` | For linking step only | id of the child's caregiver | If you are ready to link users, you can include these fields in your new user information CSV file. If you are not ready, you can leave this field blank until later. See "Link Users" for more information. |
| `teacherId` | For linking step only | id of the child's teacher | |
| `site` | Yes | Site name assigned to your research group by the DCC | Example: pilot-us-stanford-school |
| `cohort` | See note | Relevant cohort name you created in the "Add Groups" step. | Example: How Kids Learn Study |
| `school` | See note | Relevant school name you created in the "Add Groups" step. | Example: LEVANTE School |
| `class` | See note | Relevant class name you created in the "Add Groups" step. | Example: Class A |

**Note**: Either a `cohort` OR a `school` and `class` must be listed for each user, but not both.

#### LEVANTE-Generated Fields

After adding users by following Step 2B below, a new user information file is created. It is identical to the spreadsheet originally uploaded, except for three new columns on the far right (see Table 2).

**Table 2.** LEVANTE-generated user information fields

| **LEVANTE-generated field** | **Definition** | **Example** |
|-----------------------------|----------------|-------------|
| `uid` | Unique LEVANTE user id | nqiPibHoQEQr0xhdl9qg |
| `email` | Unique email address assigned to the user for logging into dashboard | j3hvtlospb@levante.com |
| `password` | Unique password tied to that email for logging into dashboard | sp6zshwer3ba |

### How to Add and Link Users

*Steps 2A, 2B, and 2C are detailed on the original page with screenshots*

---

## 3. Create Assignments

❗ Read [Before you start](#before-you-start) prior to creating assignments for users.

An assignment is a collection of tasks for users (participants) to complete within a specific period of time.

### Decide on Assignment Structure and Contents

Please see [Measures](https://researcher.levante-network.org/measures) for more information about tasks that can be included in assignments.

### How to Create Assignments

**1.** From the top navigation bar, click "Assignments", then "Create Assignment."

**2.** Complete the following:
- **Assignment Name.** See above Guidance on naming assignments
- **Start Date.** Users are able to access the assignment beginning on this date
- **End Date.** Users are no longer able to access the assignment after this date. We recommend indicating a longer time window than expected in case of recruitment or scheduling difficulties.

**3.** Select Group(s)
- **Choose the group(s) that should be given this assignment from the list of existing groups.** As groups are nested in a hierarchy, assignments given to a higher-level group automatically reach all groups nested below. We recommend giving assignments to the lowest level group possible, to prevent accidental over-assignment.
- **Chosen groups are displayed in "Selected Groups" on the right.** You can click the small x next to the group name in this panel to remove the group as needed.
- More than one group can receive the same assignment.

💡 **Tip:** An assignment is considered "active" between its start and end dates. **If users are added to existing group with an active assignment, they will be able to access that assignment.** You do not need to create a new assignment for them. If you do not want new users to see those active assignments, add a new group for those users.

**4.** Under "Select Tasks," identify the tasks you would like to include in the assignment, and click the arrow to the right of the task name to add them.
- **General instructions** for users are in "Instructions" and should go first
- Note that different **variants** of each task are displayed — make sure to select the correct version.
  - **Computer Adaptive Task (CAT) variants** are available for some tasks. These tasks take less time to complete.
  - **Language variants** are listed using unique abbreviations. In the example "en" stands for English.
- **To give surveys of any kind, select "Surveys."** The survey language depends on the user's browser settings, and the survey type depends on the type of user accessing the survey (child, caregiver, or teacher).

**5.** Repeat as needed until you have selected all the tasks (including the survey) you would like to include in your
