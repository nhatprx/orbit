package com.orbit.support;

import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.ImportBeanDefinitionRegistrar;
import org.springframework.core.type.AnnotationMetadata;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.data.repository.Repository;
import org.springframework.util.StringUtils;

/**
 * For contexts that run without a database: registers a Mockito mock for every Spring Data
 * repository interface under com.orbit, skipping any bean the test already defined explicitly.
 */
public class MockRepositoriesRegistrar implements ImportBeanDefinitionRegistrar {

    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false) {
            @Override
            protected boolean isCandidateComponent(AnnotatedBeanDefinition definition) {
                return definition.getMetadata().isInterface() && definition.getMetadata().isIndependent();
            }
        };
        scanner.addIncludeFilter(new AssignableTypeFilter(Repository.class));

        for (BeanDefinition candidate : scanner.findCandidateComponents("com.orbit")) {
            Class<?> type = load(candidate.getBeanClassName());
            String name = StringUtils.uncapitalize(type.getSimpleName());
            if (!registry.containsBeanDefinition(name)) {
                registry.registerBeanDefinition(name, mockDefinition(type));
            }
        }
    }

    private static <T> BeanDefinition mockDefinition(Class<T> type) {
        return BeanDefinitionBuilder.genericBeanDefinition(type, () -> Mockito.mock(type)).getBeanDefinition();
    }

    private static Class<?> load(String className) {
        try {
            return Class.forName(className);
        } catch (ClassNotFoundException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
