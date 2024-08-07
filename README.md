# Welcome to librify – a shelter for the audiophile at heart
Having always used a distinct structure for my music library, I slowly figured that the way Spotify is presenting music to me has changed my listening behaviour. It changed from a very self-determined genre- and album-centric way to catching myself listening to either radios based on a recently played song or the same albums that I have been playing for the last days over and over again. I was missing my tree-like structure badly and figured that what Spotify is offering just did not suit me. So I ended up developing this tool to help me and you keep better track of our individual library and being able to quickly and comprehensively navigate through it.

## How it works
[*librify*](https://librify.app) is based on [HTML](https://html.spec.whatwg.org/), [JavaScript](https://www.ecma-international.org/publications-and-standards/standards/ecma-262/), [jQuery](https://jquery.com/), [driver.js](https://driverjs.com/) and the [Spotify Web API](https://developer.spotify.com/documentation/web-api). Once retrieved, the data of your library is stored in the local storage of your browser and **NOT** on the server. This means that when you are logged out the data will be gone, so please make use of the Save button which allows you to download an export of your library and import it at a later point in time.

*librify* allows you to organize saved albums and associated artists by genre and visualize them in a tree-like structure. Genres will be initially loaded from *Spotify*. However, you can add custom genres and organize artists to your liking and start playback of albums to an active device.

## Important
The app is still in developer mode since *Spotify* says that the app does not yet require a quota extension. This means that I have to add your mail address that is connected to your *Spotify* account in the backend of the *Spotify* development dashboard in order to make it work. If you are interested please send a mail to info@librify.app containing your name and the corresponding mail address. I will then get back to you once I have added the address in the backend.

## What it looks like
![Sample](https://github.com/goforthanddie/librify/blob/master/img/sample_a.jpg?raw=true)
