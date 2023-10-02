<script>
  export let name;
  let password = "";

  let passwordValidity = "invalid";

  $: if (password.trim().length < 5) {
    passwordValidity = "short";
  } else if (password.trim().length > 10) {
    passwordValidity = "long";
  } else {
    passwordValidity = "valid";
  }

  let passwords = [];
  function addPassword() {
    if (passwordValidity === "valid")
      passwords = [...passwords, { id: Math.random(), password }];
  }

  function removePassword(password) {
    passwords = passwords.filter((item) => item.id !== password.id);
  }
</script>

<h1>Assignment</h1>

<p>Solve these tasks.</p>

<ol>
  <li>
    Add a password input field and save the user input in a variable.=> {name}
  </li>
  <li>
    Output "Too short" if the password is shorter than 5 characters and "Too
    long" if it's longer than 10.
  </li>
  <li>
    Output the password in a paragraph tag if it's between these boundaries.
  </li>
  <li>Add a button and let the user add the passwords to an array.</li>
  <li>Output the array values (= passwords) in a unordered list (ul tag).</li>
  <li>Bonus: If a password is clicked, remove it from the list.</li>
</ol>

<input type="password" bind:value={password} />
<button on:click={addPassword}>Add password</button>

{#if passwordValidity === "long"}
  <p>Password is too long</p>
{:else if passwordValidity === "short"}
  <p>Password is too short</p>
{:else}
  <p>Password: {password}</p>
{/if}

<ul>
  {#each passwords as password (password.id)}
    <li>
      <button on:click={removePassword(password)}
        >{password.password}</button
      >
    </li>
  {/each}
</ul>

<style>
  h1 {
    color: black;
  }
</style>
