<template>
  <PvPanel header="Register users">
    <div class="info-message-container mb-4">
      <i class="pi pi-exclamation-circle"></i>
      <p>Organizations must be created before registering users. You cannot register users otherwise.</p>
    </div>
    <PvDivider />
    <div class="mb-4">
      <h3>CSV Template:</h3>
      <p>Download and use our CSV template to make sure your data is formatted correctly:</p>
     <PvButton
        label="CSV Template"
        class="bg-primary mb-2 p-3 w-3 text-white border-none border-round h-3rem m-0 hover:bg-red-900"
        icon="pi pi-download"
      />
    </div>   
    <PvDivider />
    <h3>Instructions:</h3 >
    <p>These fields are <b>REQUIRED</b> for registering users:</p>
    <ul>
      <!-- <li><b>id</b> - The unique identifier for the user. Start from 1.</li> -->
      <li><b>userType</b> - The type of user. Must be one of the following: child, parent, or teacher.</li>
      <li><b>month</b> - The month of the year the user was born.<span class="required">*</span></li>
      <li><b>year</b> - The year the user was born.<span class="required">*</span></li>
      <li><b>group OR district AND school</b> - The name of the group or district and school.</li>
    </ul>
    <p>These fields are optional:</p>
    <ul class="optional-fields">
      <li><b>Class</b> - The name of the class.</li>
    </ul>
    <p>Parents and Teachers need to have the same organizations as their children / students.</p>
    <p class="mb-4"><span class="required">*</span> = Required only for child users</p>
    <p>Below is an example of what your CSV/spreadsheet could look like. Only the necessary columns will be processed.</p>
    <img
      id="example-image"
      src="https://storage.googleapis.com/road-dashboard/example_researcher_csv.png"
      alt="CSV upload example"
      style="width: 100%; max-width: 600px; height: auto;"
    />
  </PvPanel>
</template>

<script setup>
import PvPanel from 'primevue/panel';
import PvDivider from 'primevue/divider';
import PvButton from 'primevue/button';
</script>

<style scoped>
.info-message-container {
  display: flex;
  background-color: rgb(252, 252, 218);
  border: 2px solid rgb(228, 206, 7);
  border-radius: 0.5rem;
  color: rgb(199, 180, 7);
  margin-bottom: 1rem;

  p {
    font-weight: bold;
    margin: 1rem 1rem 1rem 0;
  }

  i {
    margin: 1rem;
  }
}

.required {
  color: var(--bright-red);
}
</style>
