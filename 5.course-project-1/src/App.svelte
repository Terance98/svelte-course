<script>
  import Header from "./UI/Header.svelte";
  import MeetupGrid from "./Meetups/MeetupGrid.svelte";
  import TextInput from "./UI/TextInput.svelte";
  import Button from "./UI/Button.svelte";

  let title = "";
  let subtitle = "";
  let imageUrl = "";
  let description = "";
  let address = "";
  let email = "";

  let meetUps = [
    {
      id: "m1",
      title: "Coding Bootcamp",
      subtitle: "Learn to code in 2 hours",
      description:
        "In this meetup, we will have some experts that will teach you how to code",
      imageUrl:
        "https://cdn.pixabay.com/photo/2018/06/08/00/48/developer-3461405_1280.png",
      address: "27th street, kerala",
      contactEmail: "test@123.com",
    },
    {
      id: "m2",
      title: "Web Development Workshop",
      subtitle: "Master the art of building websites",
      description:
        "Join us for an intensive workshop on web development, covering HTML, CSS, and JavaScript.",
      imageUrl:
        "https://cdn.pixabay.com/photo/2018/12/10/02/14/manhattan-3866140_640.jpg",
      address: "123 Main Street, Tech City",
      contactEmail: "workshop@example.com",
    },
    {
      id: "m3",
      title: "Data Science Meetup",
      subtitle: "Explore the world of data and analytics",
      description:
        "Connect with data science enthusiasts and professionals. Dive into the latest trends and technologies in data science.",
      imageUrl:
        "https://cdn.pixabay.com/photo/2013/07/18/09/12/woman-163426_640.jpg",
      address: "42 Data Way, Analyticsville",
      contactEmail: "datascience@example.com",
    },
  ];

  function addMeetup() {
    const newMeetup = {
      id: Math.random().toString(),
      title,
      subtitle,
      imageUrl,
      description,
      address,
      contactEmail: email,
    };

    meetUps = [newMeetup, ...meetUps];
  }
</script>

<Header />

<main>
  <form on:submit|preventDefault={addMeetup}>
    <TextInput
      id="title"
      label="Title"
      type="text"
      value={title}
      on:input={(event) => (title = event.target.value)}
    />
    <TextInput
      id="subtitle"
      label="Subtitle"
      type="text"
      value={subtitle}
      on:input={(event) => (subtitle = event.target.value)}
    />
    <TextInput
      id="address"
      label="Address"
      type="text"
      value={address}
      on:input={(event) => (address = event.target.value)}
    />
    <TextInput
      id="imageUrl"
      label="Image URL"
      type="text"
      value={imageUrl}
      on:input={(event) => (imageUrl = event.target.value)}
    />
    <TextInput
      id="email"
      label="Email"
      type="email"
      value={email}
      on:input={(event) => (email = event.target.value)}
    />
    <TextInput
      id="description"
      label="Description"
      controlType="textarea"
      value={description}
      rows="3"
      on:input={(event) => (description = event.target.value)}
    />
    <Button type="submit" caption="Save" />
  </form>

  <MeetupGrid {meetUps} />
</main>

<style>
  main {
    margin-top: 5rem;
  }

  form {
    width: 30rem;
    max-width: 90%;
    margin: auto;
  }
</style>
