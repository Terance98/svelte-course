<script>
  let courseGoal = "";
  import DisplayHeader from "./DisplayHeader.svelte";
</script>

<input type="text" bind:value={courseGoal} />
<DisplayHeader {courseGoal} />
