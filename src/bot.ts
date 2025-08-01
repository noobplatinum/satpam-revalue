import { Client, GatewayIntentBits, Guild, Role, CategoryChannel, PermissionFlagsBits, ChannelType } from 'discord.js';
import fetch from 'node-fetch';

interface Subscriber {
  id: string;
  email: string;
  discordUsername: string | null;
}

interface ApiResponse {
  message: string;
  content: Subscriber[];
  errors: any[];
}

export class SubscriberBot {
  private client: Client;
  private guild: Guild | null = null;
  private subscriberRole: Role | null = null;
  private subscriberCategory: CategoryChannel | null = null;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
      ],
    });
  }

  public async initialize(): Promise<void> {
    await this.client.login(process.env.DISCORD_TOKEN);
    
    // Wait for client to be ready
    await new Promise<void>((resolve) => {
      this.client.once('ready', () => resolve());
    });

    // Get the guild
    this.guild = await this.client.guilds.fetch(process.env.GUILD_ID!);
    console.log(`Connected to guild: ${this.guild.name}`);

    // Setup role and category
    await this.setupSubscriberRole();
    await this.setupSubscriberCategory();
  }

  private async setupSubscriberRole(): Promise<void> {
    if (!this.guild) return;

    const roleName = process.env.SUBSCRIBER_ROLE_NAME || 'Subscriber';
    
    this.subscriberRole = this.guild.roles.cache.find(role => role.name === roleName) || null;

    if (!this.subscriberRole) {
      this.subscriberRole = await this.guild.roles.create({
        name: roleName,
        color: 0x00ff00,
        reason: 'Subscriber role for premium users',
        permissions: [],
      });
      console.log(`Created subscriber role: ${roleName}`);
    } else {
      console.log(`Found existing subscriber role: ${roleName}`);
    }
  }

  private async setupSubscriberCategory(): Promise<void> {
    if (!this.guild || !this.subscriberRole) return;

    const categoryName = process.env.SUBSCRIBER_CATEGORY_NAME || 'Subscribers Only';
    
    this.subscriberCategory = this.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName
    ) as CategoryChannel || null;

    if (!this.subscriberCategory) {
      this.subscriberCategory = await this.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: this.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: this.subscriberRole.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });
      console.log(`Created subscriber category: ${categoryName}`);

      // Create a sample channel in the category
      await this.guild.channels.create({
        name: 'subscriber-chat',
        type: ChannelType.GuildText,
        parent: this.subscriberCategory.id,
      });
      console.log('Created sample subscriber chat channel');
    } else {
      console.log(`Found existing subscriber category: ${categoryName}`);
      
      await this.subscriberCategory.permissionOverwrites.set([
        {
          id: this.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: this.subscriberRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ]);
      console.log('Updated subscriber category permissions');
    }
  }

  private async getActiveSubscribers(): Promise<Subscriber[]> {
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/api/users/active-subscribers`, {
        headers: {
          'X-API-Key': process.env.DISCORD_BOT_API_KEY!,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as ApiResponse;
      return data.content || [];
    } catch (error) {
      console.error('Failed to fetch active subscribers:', error);
      return [];
    }
  }

  public async syncSubscriberRoles(): Promise<{ success: boolean; message: string; stats: any }> {
    if (!this.guild || !this.subscriberRole) {
      return { 
        success: false, 
        message: 'Guild or subscriber role not found',
        stats: null 
      };
    }

    try {
      console.log('Starting subscriber role sync...');

      const activeSubscribers = await this.getActiveSubscribers();
      const subscribersWithDiscord = activeSubscribers.filter(sub => sub.discordUsername);
      
      console.log(`Found ${activeSubscribers.length} active subscribers, ${subscribersWithDiscord.length} with Discord usernames`);

      await this.guild.members.fetch();
      const allMembers = this.guild.members.cache;

      const currentRoleHolders = allMembers.filter(member => 
        member.roles.cache.has(this.subscriberRole!.id)
      );

      let rolesGranted = 0;
      let rolesRevoked = 0;

      // Grant roles to active subscribers
      for (const subscriber of subscribersWithDiscord) {
        const discordUsername = subscriber.discordUsername!;
        
        const member = allMembers.find(member => {
          const memberTag = member.user.tag;
          const memberUsername = member.user.username;
          
          return memberTag === discordUsername || 
                 memberUsername === discordUsername ||
                 memberTag === discordUsername.replace('#0', '') ||
                 memberUsername === discordUsername.split('#')[0];
        });

        if (member && !member.roles.cache.has(this.subscriberRole.id)) {
          try {
            await member.roles.add(this.subscriberRole);
            console.log(`Granted subscriber role to ${member.user.tag}`);
            rolesGranted++;
          } catch (error) {
            console.error(`Failed to grant role to ${member.user.tag}:`, error);
          }
        }
      }

      // Revoke roles from non-subscribers
      for (const [, member] of currentRoleHolders) {
        const memberTag = member.user.tag;
        const memberUsername = member.user.username;
        
        const isActiveSubscriber = subscribersWithDiscord.some(sub => {
          const discordUsername = sub.discordUsername!;
          return memberTag === discordUsername || 
                 memberUsername === discordUsername ||
                 memberTag === discordUsername.replace('#0', '') ||
                 memberUsername === discordUsername.split('#')[0];
        });

        if (!isActiveSubscriber) {
          try {
            await member.roles.remove(this.subscriberRole);
            console.log(`Revoked subscriber role from ${member.user.tag}`);
            rolesRevoked++;
          } catch (error) {
            console.error(`Failed to revoke role from ${member.user.tag}:`, error);
          }
        }
      }

      const stats = {
        totalSubscribers: activeSubscribers.length,
        subscribersWithDiscord: subscribersWithDiscord.length,
        rolesGranted,
        rolesRevoked,
        currentRoleHolders: currentRoleHolders.size
      };

      console.log(`Sync complete:`, stats);
      
      return {
        success: true,
        message: `Sync complete: ${rolesGranted} roles granted, ${rolesRevoked} roles revoked`,
        stats
      };
    } catch (error) {
      console.error('Error during role sync:', error);
      return {
        success: false,
        message: `Error during sync: ${error}`,
        stats: null
      };
    }
  }

  public async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
    }
  }
}