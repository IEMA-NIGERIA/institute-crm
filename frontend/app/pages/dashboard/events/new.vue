<template>
   <NuxtLayout name="dashboard-layout">
      <NuxtLink to="/dashboard/events" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to events</NuxtLink>
      <h2 class="text-2xl mt-2 mb-1">New Event</h2>
      <p class="mt-0 mb-4 text-gray-600">Set up a training course, workshop, seminar, conference or award ceremony.</p>
      <EventsForm />
   </NuxtLayout>
</template>
