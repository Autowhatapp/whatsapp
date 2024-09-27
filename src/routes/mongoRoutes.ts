import express from 'express';
import { MongoClient, ObjectId, ServerHeartbeatFailedEvent } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);
const dbName = process.env.DB_NAME!;

interface workspace {
    _id: ObjectId;
    name: string;
    // Add other workspace fields as needed
}

interface BotAssociation {
    bot: ObjectId | null;
    role: string | null;

}

interface workspaceAssociation {
    workspace: ObjectId;
    botAssociations: BotAssociation[];
}

interface User {
    _id: ObjectId;
    phone: string;
    name: string;
    workspaceAssociations: workspaceAssociation[];
    // Add other user fields as needed
}

interface User {
    userId: string;  // Changed from 'id' to 'userId'
    name: string;
    role: string;
  }

  interface Bot {
    _id: ObjectId;
    name: string;
    users?: {
        userId: string;
        name: string;
        role: string;
    }[];
    // Add other bot fields as needed
}

// Connect to MongoDB
client.connect().then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Failed to connect to MongoDB', err);
});

// User routes
router.post('/users', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');
        const result = await collection.insertOne(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

router.get('/users/:phone', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');
        const user = await collection.findOne({ phone: req.params.phone });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

router.post('/users/associate-bot', async (req, res) => {
    const { userId, workspaceId, botId, role } = req.body;


    console.log(userId, workspaceId, botId, role,"associte bot jfjfjjfjjfjjjfjffj")
    // Validate input
    if (!userId || !workspaceId || !botId || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');

        // Convert string IDs to ObjectIds
        const userObjectId = new ObjectId(userId);
        const workspaceObjectId = new ObjectId(workspaceId);
        const botObjectId = new ObjectId(botId);

        // Find the user
        const user = await collection.findOne({ _id: userObjectId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Workspace Associations:', user.workspaceAssociations);

        // Find the index of the workspace in the user's associations
        const workspaceIndex = user.workspaceAssociations?.findIndex(assoc => 
            assoc.workspace.toString() === workspaceObjectId.toString()
        ) ?? -1;

        if (workspaceIndex === -1) {
            // Workspace not found, add a new association
            await collection.updateOne(
                { _id: userObjectId },
                {
                    $push: {
                        workspaceAssociations: {
                            workspace: workspaceObjectId,
                            botAssociations: [{
                                bot: botObjectId,
                                role: role
                            }]
                        }
                    }
                }
            );
        } else {
            // Workspace exists, add to existing botAssociations
            await collection.updateOne(
                { _id: userObjectId },
                {
                    $push: {
                        [`workspaceAssociations.${workspaceIndex}.botAssociations`]: {
                            bot: botObjectId,
                            role: role
                        }
                    }
                }
            );
        }

        res.json({ message: 'Bot associated successfully' });
    } catch (error) {
        console.error('Error associating bot with user and workspace:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



router.post('/workspaceexuser', async (req, res) => {
    const { userId, workspaceData } = req.body;
console.log(userId, workspaceData,"userId, workspaceData")
    if (!userId || !workspaceData) {
      //  return res.status(400).json({ error: 'userId and workspaceData are required' });
    }

    try {
        const db = client.db(dbName);
        const workspacesCollection = db.collection<workspace>('workspaces');
        const usersCollection = db.collection<User>('users');
console.log(usersCollection,"sda")
        // Step 1: Create the new workspace
        const newworkspace = await workspacesCollection.insertOne(workspaceData);
        const workspaceId = await newworkspace.insertedId;
        console.log(workspaceId,"workspaceIdworkspaceIdzzzzzzz")

        // Step 2: Update the user with the new workspace association
        const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $push: {
                    workspaceAssociations: {
                        workspace: workspaceId,
                        botAssociations: []
                    }
                }
            }
        );
console.log(updateResult,"updateResultupdateResultupdateResult")
        if (updateResult.modifiedCount === 0) {
          //  return res.status(404).json({ error: 'User not found or workspace association not added' });
        }

        res.status(201).json({ message: 'workspace created and associated with user', workspaceId });
    } catch (error) {
        console.error("Error creating workspace or updating user:", error);
        res.status(500).json({ error: 'Error creating workspace or updating user' });
    }
});

// workspace routes
router.post('/workspace', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection<workspace>('workspaces');
        const result = await collection.insertOne(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating workspace:', error);
        res.status(500).json({ error: 'Error creating workspace' });
    }
});

router.get('/workspaces/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid workspace ID format' });
        }

        const db = client.db(dbName);
        const collection = db.collection<workspace>('workspaces');
        const workspace = await collection.findOne({ _id: new ObjectId(id) });
        
        if (workspace) {
            res.json(workspace);
        } else {
            res.status(404).json({ error: 'workspace not found' });
        }
    } catch (error) {
        console.error("Error fetching workspace:", error);
        res.status(500).json({ error: 'Error fetching workspace' });
    }
});

router.get('/user/:userId/workspacesowner', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Fetching workspaces for userId:', userId);
        
        const db = client.db(dbName);
        const usersCollection = db.collection<User>('users');
        
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        
        if (!user) {
            console.warn('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Filter workspaces where any bot has the role of "owner"
        const workspacesWithOwnerBots = user.workspaceAssociations.filter(association => 
            association.botAssociations.some(bot => bot.role === "owner")
        );
        
        console.log('Filtered workspace associations:', workspacesWithOwnerBots);
        
        const workspaceIds = workspacesWithOwnerBots.map(association => association.workspace);
        
        if (workspaceIds.length === 0) {
            console.warn('No workspaces with owner bots found for user:', userId);
            return res.json([]);
        }
        
        const workspacesCollection = db.collection<workspace>('workspaces');
        const workspaces = await workspacesCollection.find({ _id: { $in: workspaceIds } }).toArray();
        
        console.log('Fetched workspaces:', workspaces);
        
        res.json(workspaces);
        
    } catch (error) {
        console.error('Error fetching workspaces for user:', error);
        res.status(500).json({ error: 'Error fetching workspaces for user' });
    }
});
router.get('/user/:userId/workspacesuser', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Fetching workspaces for userId:', userId);
        
        const db = client.db(dbName);
        const usersCollection = db.collection<User>('users');
        
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        
        if (!user) {
            console.warn('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Filter workspaces where any bot has the role of "owner"
        const workspacesWithOwnerBots = user.workspaceAssociations.filter(association => 
            association.botAssociations.some(bot => bot.role === "user")
        );
        
        console.log('Filtered workspace associations:', workspacesWithOwnerBots);
        
        const workspaceIds = workspacesWithOwnerBots.map(association => association.workspace);
        
        if (workspaceIds.length === 0) {
            console.warn('No workspaces with owner bots found for user:', userId);
            return res.json([]);
        }
        
        const workspacesCollection = db.collection<workspace>('workspaces');
        const workspaces = await workspacesCollection.find({ _id: { $in: workspaceIds } }).toArray();
        
        console.log('Fetched workspaces:', workspaces);
        
        res.json(workspaces);
        
    } catch (error) {
        console.error('Error fetching workspaces for user:', error);
        res.status(500).json({ error: 'Error fetching workspaces for user' });
    }
});
// Bot routes
router.post('/bots', async (req, res) => {
    try {
        console.log(req.body, "req.body");
        const db = client.db(dbName);
        const collection = db.collection<Bot>('bots');
        const result = await collection.insertOne(req.body);
        console.log(result, "result");
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating bot:', error);
        res.status(500).json({ error: 'Error creating bot' });
    }
});

router.get('/bots/:id', async (req, res) => {

    console.log('Requested bot ID:', req.params.id);

    try {
        const db = client.db(dbName);
        const collection = db.collection<Bot>('bots');
        const bot = await collection.findOne({ _id: new ObjectId(req.params.id) });
        if (bot) {
            res.json(bot);
        } else {
            res.status(404).json({ error: 'Bot not found' });
        }
    } catch (error) {
        console.error('Error fetching bot:', error);
        res.status(500).json({ error: 'Error fetching bot' });
    }
});



router.post('/adduserstobot', async (req, res) => {
    try {
        const { botId, userid, name, role } = req.body;
        console.log(req.body,"dfgfdgdf")
        
        if (!botId || !userid || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const db = client.db(dbName);
        const collection = db.collection<Bot>('bots');

       
        const result = await collection.updateOne(
            { _id: new ObjectId(botId) },
            { $push: { users: {userId: userid,
                name: name,
                role: role} } },
            { upsert: true }
        );

        if (result.matchedCount > 0) {
            res.json({ message: 'User added to bot successfully' });
        } else if (result.upsertedCount > 0) {
            res.json({ message: 'New bot created with user' });
        } else {
            res.status(404).json({ error: 'Bot not found and unable to create new one' });
        }
    } catch (error) {
        console.error('Error adding user to bot:', error);
        res.status(500).json({ error: 'Error adding user to bot' });
    }
});










// Get bots for user and workspace
router.get('/users/:userId/workspaces/:workspaceId/bots', async (req, res) => {
    console.log(req.params,"Server HeartbeatFailedEventat sers/:userId/workspaces/:workspaceId/bot")
    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');
        const user = await collection.findOne(
            { 
                _id: new ObjectId(req.params.userId),
                "workspaceAssociations.workspace": new ObjectId(req.params.workspaceId)
            },
            {
                projection: { "workspaceAssociations.$": 1 }
            }
        );

        console.log(user)

        if (!user || !user.workspaceAssociations || user.workspaceAssociations.length === 0) {
            return res.status(404).json({ error: 'User or workspace association not found' });
        }

        const botIds = user.workspaceAssociations[0].botAssociations
            .map(assoc => assoc.bot)
            .filter((id): id is ObjectId => id !== null);

        const botsCollection = db.collection<Bot>('bots');
        const bots = await botsCollection.find({ _id: { $in: botIds } }).toArray();

        res.json(bots.map(bot => ({ name: bot.name, uuid: bot._id.toString() })));
    } catch (error) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: 'Error fetching bots' });
    }
});

export default router;