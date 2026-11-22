package com.orbit.collab.config;

import com.orbit.collab.service.CollabRelay;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name = "orbit.chat.redis.enabled", havingValue = "true", matchIfMissing = true)
public class CollabRedisListenerConfig {
    @Bean
    RedisMessageListenerContainer collabRedisListenerContainer(
        RedisConnectionFactory connectionFactory, CollabRelay relay
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(relay, new ChannelTopic(CollabRelay.REDIS_TOPIC));
        return container;
    }
}
