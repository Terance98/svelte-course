<style>
  h1 {
    color: black;
  }

  .red-h1 {
    color: red;
  }
</style>

<script>
    export let courseGoal;
    $: shouldHighlight = courseGoal.includes('!')
</script>


<h1 class:red-h1={shouldHighlight}>{courseGoal}</h1>
