<script>
  import ContactCard from "./ContactCard.svelte";

  export let name = "Terance";
  export let age = 25;

  let imageUrl,
    jobTitle = "",
    description = "";

  $: uppercaseName = name.toUpperCase();

  $: console.log(name);

  $: if (name === "Skippy") {
    age = 28;
  }

  function incrementAge() {
    age += 1;
  }

  function changeName() {
    name = "Skippy";
  }

  function nameInput(event) {
    const enteredValue = event.target.value;
    name = enteredValue;
  }
</script>

<h1>Hello {uppercaseName}!, your age is {age}</h1>
<button on:click={incrementAge}> Change age</button>
<!-- <button on:click={changeName}>Change Name</button> -->
<!-- <input type="text" value={name} on:input={nameInput} /> -->
<input type="text" bind:value={name} />
<input type="text" bind:value={jobTitle} />
<input type="text" bind:value={imageUrl} />
<input type="text" bind:value={description} />

<ContactCard userName={name} {imageUrl} {jobTitle} {description} />

<style>
  h1 {
    color: purple;
  }
</style>
