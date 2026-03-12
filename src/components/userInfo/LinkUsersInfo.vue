<template>
  <PvPanel header="Link Users" class="link-users-panel">
    <div class="info-message-container">
      <i class="pi pi-exclamation-circle"></i>
      <p>
        Make sure you are uploading a modified version of the registered users file that was provided after the add users step. This new file contains LEVANTE UIDs essential for linking users.
      </p>
    </div>

    <div class="how-to-section">
      <h3>How to Link Users</h3>
      <p>Before you begin, please read our full documentation on adding and linking users.</p>
      <p>
        <DocsButton href="https://researcher.levante-network.org/dashboard/add-users" label="Link Users Documentation" />
      </p>
      <p>Before linking users, update your registered users file with linkage information by populating the caregiverId and teacherId fields in relevant child user rows.</p>
    </div>



    <p>
      Below is an example of what your CSV/spreadsheet should look like. Only the required columns will be processed.
    </p>

    <div class="csv-example-image-container">
      <img
        id="link-users-example-image"
        :src="LEVANTE_STATIC_ASSETS_URL + '/link_users_example_with_permissions.png'"
        alt="Link Users CSV example"
        class="csv-example-image"
      />
    </div>

    <p>To link users,  choose your completed registered users file to upload and click "Start Linking".</p>
  </PvPanel>
</template>

<script setup>
import DocsButton from '@/components/DocsButton.vue';
import PvPanel from 'primevue/panel';
import { LEVANTE_STATIC_ASSETS_URL } from '@/constants/bucket';
</script>

<style scoped>
.info-message-container {
  display: flex;
  background-color: rgb(236, 141, 124);
  border: 2px solid rgb(228, 59, 7);
  border-radius: 0.5rem;
  color: rgb(131, 32, 2);
  margin-bottom: 1rem;

  p {
    font-weight: bold;
    margin: 1rem 1rem 1rem 0;
  }

  i {
    margin: 1rem;
  }
}

#example-image {
  width: 100%;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}

.field-marker {
  color: var(--bright-red);
  font-weight: bold;
  vertical-align: super;
  font-size: 0.8em;
  margin-left: 0.1em;
}

.legend {
  line-height: 1.6;
}

.link-users-panel :deep(.p-panel-header) {
  font-size: 2rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.how-to-section {
  background-color: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin: 2rem 0;

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary-color);
    font-size: 1.2rem;
    font-weight: bold;
  }

  .numbered-steps {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      margin-bottom: 0.75rem;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    li:last-child {
      margin-bottom: 0;
    }

    .step-number {
      background-color: var(--primary-color);
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }
  }
}

.csv-example-image-container {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  position: relative;
  height: 123px;

  .csv-example-image {
    width: auto;
    max-height: 108px;
    display: block;
    position: absolute;
    left: 0;
  }
}
</style>
