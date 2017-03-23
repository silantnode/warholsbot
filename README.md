#warholbot A bot for Telegram that facilitates transactions for an informal alternative currency called Warhols. It is planned to have several different 'flavors' of warhols that allow for people to experiment with different types of currency designs.

Basic Idea:

The idea for the project is the following:

- People message the WarholsBot on Telegram
- They get a chance to earn Warhols currency by performing tasks
- The first tasks will be provided by the "sponsors", who already start with an account pre-filled with many Warhols

The user will choose from a list of tasks. Here are some examples:

- Visit the Yono page at SITO.ORG - get 20 Warhols (URL)
- Follow @groblinlagumba on Twitter - get 5 Warhols (URL)
- Watch the Gridcosm Unplugged video - get 30 Warhols (URL)
- Attend Jon Van Oast's talk at ISEA - get 100 Warhols (URL)
- Load more tasks

After choosing one of the tasks, we verify if the person really did it, by asking a question about the content they read/watched. We can make this a multiple choice of 4 or something… if they answer right they get the Warhols, if not they don't and can then choose another task.

In this way the Warhols will move from the sponsors "accounts" to the users. When users have a balance of Warhols they can create tasks of their own and become "sponsors". 

So in the beginning people will see only the initial sponsors tasks, but later there will be user created tasks as well. And the Warhols will circulate around.

Previously the project was being developed using PHP and MySQL. In order to simplify the implementation we are rebuilding the project using Node.js to interface with Telegram. We will continue to use the same MySQL database.
