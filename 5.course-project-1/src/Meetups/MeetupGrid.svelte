<script>
  import MeetupItem from "./MeetupItem.svelte";

  export let meetUps;
</script>

<section id="meetups">
  {#each meetUps as meetup (meetup.id)}
    <MeetupItem
      title={meetup.title}
      subtitle={meetup.subtitle}
      imageUrl={meetup.imageUrl}
      description={meetup.description}
      email={meetup.contactEmail}
      address={meetup.address}
    />
  {/each}
</section>

<style>
  section {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    grid-gap: 1rem;
  }

  @media (min-width: 768px) {
    section {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
