import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);
const dbName = process.env.DB_NAME!;

interface Company {
    _id: ObjectId;
    name: string;
    // Add other company fields as needed
}

interface BotAssociation {
    bot: ObjectId | null;
    role: string | null;
}

interface CompanyAssociation {
    company: ObjectId;
    botAssociations: BotAssociation[];
}

interface User {
    _id: ObjectId;
    phone: string;
    name: string;
    companyAssociations: CompanyAssociation[];
    // Add other user fields as needed
}

interface Bot {
    _id: ObjectId;
    name: string;
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
    const { userId, companyId, botId, role } = req.body;

    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');

        // First, find the user and check if companyAssociations exists
        const user = await collection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the companyAssociations array exists and if the specific company is already associated
        const companyIndex = user.companyAssociations?.findIndex(c => c.company.equals(new ObjectId(companyId))) ?? -1;

        if (companyIndex === -1) {
            // Company not found, push a new association
            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $push: {
                        companyAssociations: {
                            company: new ObjectId(companyId),
                            botAssociations: [{
                                bot: new ObjectId(botId),
                                role: role
                            }]
                        }
                    }
                }
            );
        } else {
            // Company exists, push to the existing botAssociations
            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $push: {
                        [`companyAssociations.${companyIndex}.botAssociations`]: {
                            bot: new ObjectId(botId),
                            role: role
                        }
                    }
                }
            );
        }

        res.json({ message: 'Bot associated successfully' });
    } catch (error) {
        console.error('Error associating bot with user and company:', error);
        res.status(500).json({ error: 'Error associating bot with user and company' });
    }
});



router.post('/companyexuser', async (req, res) => {
    const { userId, companyData } = req.body;

    if (!userId || !companyData) {
        return res.status(400).json({ error: 'userId and companyData are required' });
    }

    try {
        const db = client.db(dbName);
        const companiesCollection = db.collection<Company>('companies');
        const usersCollection = db.collection<User>('users');

        // Step 1: Create the new company
        const newCompany = await companiesCollection.insertOne(companyData);
        const companyId = newCompany.insertedId;

        // Step 2: Update the user with the new company association
        const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $push: {
                    companyAssociations: {
                        company: companyId,
                        botAssociations: []
                    }
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(404).json({ error: 'User not found or company association not added' });
        }

        res.status(201).json({ message: 'Company created and associated with user', companyId });
    } catch (error) {
        console.error("Error creating company or updating user:", error);
        res.status(500).json({ error: 'Error creating company or updating user' });
    }
});

// Company routes
router.post('/company', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection<Company>('companies');
        const result = await collection.insertOne(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({ error: 'Error creating company' });
    }
});

router.get('/companies/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid company ID format' });
        }

        const db = client.db(dbName);
        const collection = db.collection<Company>('companies');
        const company = await collection.findOne({ _id: new ObjectId(id) });
        
        if (company) {
            res.json(company);
        } else {
            res.status(404).json({ error: 'Company not found' });
        }
    } catch (error) {
        console.error("Error fetching company:", error);
        res.status(500).json({ error: 'Error fetching company' });
    }
});

router.get('/user/:userId/companies', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Fetching companies for userId:', userId);

        const db = client.db(dbName);
        const usersCollection = db.collection<User>('users');

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            console.warn('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        const companyIds = user.companyAssociations?.map(association => association.company);

        console.log('Company IDs:', companyIds);

        if (!companyIds || companyIds.length === 0) {
            console.warn('No company associations found for user:', userId);
            return res.json([]);
        }

        const companiesCollection = db.collection<Company>('companies');
        const companies = await companiesCollection.find({ _id: { $in: companyIds } }).toArray();

        console.log('Fetched companies:', companies);

        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies for user:', error);
        res.status(500).json({ error: 'Error fetching companies for user' });
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

// Get bots for user and company
router.get('/users/:userId/companies/:companyId/bots', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');
        const user = await collection.findOne(
            { 
                _id: new ObjectId(req.params.userId),
                "companyAssociations.company": new ObjectId(req.params.companyId)
            },
            {
                projection: { "companyAssociations.$": 1 }
            }
        );

        if (!user || !user.companyAssociations || user.companyAssociations.length === 0) {
            return res.status(404).json({ error: 'User or company association not found' });
        }

        const botIds = user.companyAssociations[0].botAssociations
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